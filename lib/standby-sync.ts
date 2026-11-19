/**
 * Keeps the standby database (STANDBY_DATABASE_URL) a copy of the main one, so the site
 * can switch to it read-only when the main database fails (lib/db-mode.ts).
 *
 * Every run (instrumentation.ts, every few minutes as set in Admin → Settings → Database; `npm run standby:sync`):
 * - each table's rows are read from the main database in primary-key order and hashed;
 *   only rows that changed since the last run are written to the standby (one
 *   INSERT … ON DUPLICATE KEY UPDATE per batch), and rows gone from the main database
 *   are deleted there. The hashes live in UPLOADS_DIR/.standby-sync/, so a run sends
 *   almost nothing when little changed (the standby's free quota counts writes);
 * - a table too big to scan every time (over FULL_SCAN_MAX_ROWS) copies rows changed
 *   since the last run by updatedAt/createdAt instead; deletions there wait for the
 *   nightly full run;
 * - once a night (and with --full) every row is sent again, which also repairs a
 *   standby that was reset.
 *
 * Only one server process runs it at a time (a marker file), never while the site is on
 * the standby (the copy is read-only then), and it never throws.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { primaryClient, standbyClient } from "@/lib/prisma";
import { currentMode } from "@/lib/db-mode";
import { uploadsRoot } from "@/lib/media/avatars";

export const FULL_SCAN_MAX_ROWS = 20_000;
const PAGE_ROWS = 2_000;
const BATCH_ROWS = 200;
const BATCH_BYTES = 512 * 1024;
/** Re-send rows changed this long before the last run of a big table (clock skew, long transactions). */
const OVERLAP_MS = 2 * 60_000;
/** Hour (UTC) of the nightly full run: 20:00 UTC is 02:00 in Bangladesh. */
export const NIGHTLY_HOUR_UTC = 20;

type Row = Record<string, unknown>;

export interface TableResult {
  table: string;
  rows: number;
  written: number;
  deleted: number;
  mode: "scan" | "incremental" | "skipped" | "excluded";
  error?: string;
}

export interface SyncResult {
  ran: boolean;
  reason?: string;
  full: boolean;
  tables: TableResult[];
  written: number;
  deleted: number;
  bytes: number;
  ms: number;
}

export function standbySyncDir(): string {
  return path.join(uploadsRoot(), ".standby-sync");
}

function q(name: string): string {
  return "`" + name.replace(/`/g, "``") + "`";
}

/** A row value as the standby's driver takes it. */
function toParam(v: unknown): unknown {
  if (v === undefined) return null;
  if (v === null || v instanceof Date || typeof v === "bigint" || typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (v instanceof Uint8Array) return Buffer.from(v);
  // JSON columns can come back parsed.
  return JSON.stringify(v);
}

function stable(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Uint8Array) return Buffer.from(v).toString("base64");
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function rowHash(row: Row, columns: string[]): string {
  const h = crypto.createHash("sha1");
  for (const c of columns) {
    h.update(c);
    h.update("\u0000");
    h.update(row[c] === null || row[c] === undefined ? "\u0001null" : stable(row[c]));
    h.update("\u0000");
  }
  return h.digest("base64").slice(0, 16);
}

function approxBytes(row: Row): number {
  let n = 0;
  for (const v of Object.values(row)) n += v == null ? 1 : typeof v === "string" ? v.length : v instanceof Uint8Array ? v.length : 16;
  return n;
}

interface TableInfo {
  name: string;
  columns: string[];
  key: string[];
}

async function listTables(db: PrismaClient): Promise<TableInfo[]> {
  const tables = await db.$queryRawUnsafe<{ t: string }[]>(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT LIKE '\\_prisma%'"
  );
  const cols = await db.$queryRawUnsafe<{ t: string; c: string; p: number | bigint }[]>(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c, ORDINAL_POSITION AS p FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  const keys = await db.$queryRawUnsafe<{ t: string; c: string; p: number | bigint }[]>(
    "SELECT TABLE_NAME AS t, COLUMN_NAME AS c, ORDINAL_POSITION AS p FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'PRIMARY' ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  const lower = (s: string) => s.toLowerCase();
  return tables.map(({ t }) => ({
    name: t,
    columns: cols.filter((c) => lower(c.t) === lower(t)).map((c) => c.c),
    key: keys.filter((k) => lower(k.t) === lower(t)).map((k) => k.c),
  }));
}

/** Upserts rows into the standby in batches, foreign-key checks off (parents and children arrive in any order). */
async function upsertRows(standby: PrismaClient, table: string, columns: string[], rows: Row[]): Promise<number> {
  let bytes = 0;
  const updates = columns.map((c) => `${q(c)} = VALUES(${q(c)})`).join(", ");
  let batch: Row[] = [];
  let batchBytes = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    const placeholders = batch.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    const params = batch.flatMap((r) => columns.map((c) => toParam(r[c])));
    const sql = `INSERT INTO ${q(table)} (${columns.map(q).join(", ")}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`;
    await standby.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
        await tx.$executeRawUnsafe(sql, ...params);
      },
      { timeout: 120_000, maxWait: 30_000 }
    );
    batch = [];
    batchBytes = 0;
  };
  for (const row of rows) {
    const size = approxBytes(row);
    if (batch.length >= BATCH_ROWS || (batch.length > 0 && batchBytes + size > BATCH_BYTES)) await flush();
    batch.push(row);
    batchBytes += size;
    bytes += size;
  }
  await flush();
  return bytes;
}

async function deleteKeys(standby: PrismaClient, table: string, key: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await standby.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
        await tx.$executeRawUnsafe(`DELETE FROM ${q(table)} WHERE ${q(key)} IN (${chunk.map(() => "?").join(", ")})`, ...chunk);
      },
      { timeout: 120_000, maxWait: 30_000 }
    );
  }
}

interface HashFile {
  /** Primary key → row hash, as last written to the standby. */
  rows: Record<string, string>;
  /** For big tables: when the last incremental run started. */
  since?: string;
}

async function readHashes(dir: string, table: string): Promise<HashFile> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, `${table}.json`), "utf8")) as HashFile;
  } catch {
    return { rows: {} };
  }
}

async function writeHashes(dir: string, table: string, data: HashFile): Promise<void> {
  const file = path.join(dir, `${table}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, file);
}

function keyOf(row: Row, key: string[]): string {
  return key.map((k) => stable(row[k])).join("\u0000");
}

/** Reads a table page by page in primary-key order (single-column keys; all our tables have one). */
async function* scan(primary: PrismaClient, t: TableInfo, columns: string[]): AsyncGenerator<Row[]> {
  const k = t.key[0];
  let after: unknown = undefined;
  for (;;) {
    const rows: Row[] =
      after === undefined
        ? await primary.$queryRawUnsafe<Row[]>(`SELECT ${columns.map(q).join(", ")} FROM ${q(t.name)} ORDER BY ${q(k)} LIMIT ${PAGE_ROWS}`)
        : await primary.$queryRawUnsafe<Row[]>(`SELECT ${columns.map(q).join(", ")} FROM ${q(t.name)} WHERE ${q(k)} > ? ORDER BY ${q(k)} LIMIT ${PAGE_ROWS}`, after);
    if (rows.length === 0) return;
    yield rows;
    if (rows.length < PAGE_ROWS) return;
    after = rows[rows.length - 1][k];
  }
}

/**
 * Privacy: what never leaves the main database, even to the standby.
 * - The activity log (visitors' IP addresses and browsers): a read-only site does not need it.
 * - Password hashes: replaced by a placeholder no password matches, so the copy holds none;
 *   signing in waits while the site is on the standby (lib/auth.ts), sessions stay valid.
 */
export const STANDBY_EXCLUDED_TABLES = ["ActivityLog"];
export const STANDBY_PASSWORD_PLACEHOLDER = "!standby-copy: no password is stored here";
const MASKED_COLUMNS: Record<string, Record<string, unknown>> = {
  user: { passwordHash: STANDBY_PASSWORD_PLACEHOLDER },
};

function isExcluded(table: string): boolean {
  return STANDBY_EXCLUDED_TABLES.some((t) => t.toLowerCase() === table.toLowerCase());
}

/** Replaces protected columns before anything is hashed or sent. */
function protect(table: string, rows: Row[]): Row[] {
  const masked = MASKED_COLUMNS[table.toLowerCase()];
  if (masked) for (const row of rows) for (const [column, value] of Object.entries(masked)) if (column in row) row[column] = value;
  return rows;
}

async function syncTable(primary: PrismaClient, standby: PrismaClient, t: TableInfo, standbyCols: string[], dir: string, full: boolean, startedAt: Date): Promise<TableResult & { bytes: number }> {
  const columns = t.columns.filter((c) => standbyCols.includes(c));
  const result = { table: t.name, rows: 0, written: 0, deleted: 0, mode: "scan" as TableResult["mode"], bytes: 0 };
  if (isExcluded(t.name)) {
    // Never copied; anything there (an older copy) is removed.
    if (standbyCols.length > 0) {
      const leftover = await standby.$queryRawUnsafe<Row[]>(`SELECT 1 AS x FROM ${q(t.name)} LIMIT 1`);
      if (leftover.length) result.deleted = Number(await standby.$executeRawUnsafe(`DELETE FROM ${q(t.name)}`));
    }
    return { ...result, mode: "excluded" };
  }
  if (t.key.length !== 1 || columns.length === 0) {
    return { ...result, mode: "skipped", error: t.key.length !== 1 ? "no single-column primary key" : "table missing on the standby" };
  }
  const [{ n }] = await primary.$queryRawUnsafe<{ n: number | bigint }[]>(`SELECT COUNT(*) AS n FROM ${q(t.name)}`);
  result.rows = Number(n);
  const saved = full ? { rows: {} } : await readHashes(dir, t.name);
  const stamp = ["updatedAt", "createdAt"].find((c) => columns.includes(c));

  if (!full && result.rows > FULL_SCAN_MAX_ROWS && stamp && saved.since) {
    // Big table: only rows stamped since the last run (minus an overlap).
    result.mode = "incremental";
    const since = new Date(new Date(saved.since).getTime() - OVERLAP_MS);
    const rows = protect(t.name, await primary.$queryRawUnsafe<Row[]>(`SELECT ${columns.map(q).join(", ")} FROM ${q(t.name)} WHERE ${q(stamp)} >= ?`, since));
    if (rows.length) result.bytes = await upsertRows(standby, t.name, columns, rows);
    result.written = rows.length;
    await writeHashes(dir, t.name, { rows: {}, since: startedAt.toISOString() });
    return result;
  }

  const seen: Record<string, string> = {};
  for await (const page of scan(primary, t, columns)) {
    const changed: Row[] = [];
    for (const row of protect(t.name, page)) {
      const id = keyOf(row, t.key);
      const hash = rowHash(row, columns);
      seen[id] = hash;
      if (saved.rows[id] !== hash) changed.push(row);
    }
    if (changed.length) {
      result.bytes += await upsertRows(standby, t.name, columns, changed);
      result.written += changed.length;
    }
  }
  // Rows gone from the main database. A full run does not know what the standby holds,
  // so it compares against the standby's own keys.
  let gone: string[];
  if (full) {
    const ids = await standby.$queryRawUnsafe<Row[]>(`SELECT ${q(t.key[0])} AS id FROM ${q(t.name)}`);
    gone = ids.map((r) => stable(r.id)).filter((id) => !(id in seen));
  } else {
    gone = Object.keys(saved.rows).filter((id) => !(id in seen));
  }
  if (gone.length) {
    await deleteKeys(standby, t.name, t.key[0], gone);
    result.deleted = gone.length;
  }
  await writeHashes(dir, t.name, { rows: seen, since: startedAt.toISOString() });
  return result;
}

/** Claims a marker file; true only for the first process to ask. */
async function claim(dir: string, name: string): Promise<boolean> {
  try {
    const handle = await fs.open(path.join(dir, name), "wx");
    await handle.close();
    return true;
  } catch {
    return false;
  }
}

export interface SyncOptions {
  full?: boolean;
  now?: Date;
  dir?: string;
  primary?: PrismaClient;
  standby?: PrismaClient | null;
  /** Scheduled runs claim their time slot so only one server process copies; manual runs do not. */
  claimSlot?: boolean;
  /** Length of a scheduled slot in minutes (Admin → Settings → Database; lib/standby-sync-setting.ts). */
  everyMinutes?: number;
}

export interface LastRun {
  at: string;
  ran: boolean;
  full: boolean;
  written: number;
  deleted: number;
  ms: number;
  reason?: string;
  failed: { table: string; error: string }[];
}

const LAST_RUN_FILE = "last-run.json";

/** What the last copy did, for Admin → Settings; null before the first one. */
export async function readLastStandbyRun(dir = standbySyncDir()): Promise<LastRun | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir, LAST_RUN_FILE), "utf8")) as LastRun;
  } catch {
    return null;
  }
}

async function saveLastRun(dir: string, run: LastRun): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, LAST_RUN_FILE);
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(run));
    await fs.rename(tmp, file);
  } catch {
    // Only a status display.
  }
}

let running = false;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The standby must only ever hold the live database. A development machine (main
 * database on localhost) copying its test data to a remote standby would overwrite the
 * live copy and delete live rows it does not have, so that direction is refused.
 */
export function copyDirectionProblem(sourceUrl: string | undefined, targetUrl: string | undefined, nodeEnv = process.env.NODE_ENV): string | null {
  if (!sourceUrl || !targetUrl) return null;
  try {
    const source = new URL(sourceUrl);
    const target = new URL(targetUrl);
    // The live server also reaches its own database on 127.0.0.1, so "local" alone is not
    // enough: a local source counts as test data outside production, or when it is one of
    // this project's development databases (sshs_dev, sshs_test, …).
    const testSource = LOCAL_HOSTS.has(source.hostname) && (nodeEnv !== "production" || /^\/sshs_/i.test(source.pathname));
    if (testSource && !LOCAL_HOSTS.has(target.hostname)) {
      return "the main database is a test database on this machine and the standby is remote (the live copy): refusing to copy test data over the live copy";
    }
  } catch {
    return "DATABASE_URL or STANDBY_DATABASE_URL is not a valid URL";
  }
  return null;
}

/** One copy run. Never throws; says what it did. */
export async function runStandbySync(opts: SyncOptions = {}): Promise<SyncResult> {
  const now = opts.now ?? new Date();
  const started = Date.now();
  const empty = (reason: string): SyncResult => ({ ran: false, reason, full: false, tables: [], written: 0, deleted: 0, bytes: 0, ms: 0 });
  const standby = opts.standby === undefined ? standbyClient() : opts.standby;
  if (!standby) return empty("no standby configured");
  if (!opts.standby && !opts.primary) {
    const problem = copyDirectionProblem(process.env.DATABASE_URL, process.env.STANDBY_DATABASE_URL);
    if (problem) {
      console.error(`[standby-sync] Not copying: ${problem}.`);
      return empty(problem);
    }
  }
  if (currentMode() === "standby") return empty("the site is on the standby");
  if (running) return empty("already running");
  const dir = opts.dir ?? standbySyncDir();
  const primary = opts.primary ?? primaryClient();
  running = true;
  try {
    await fs.mkdir(dir, { recursive: true });
    if (opts.claimSlot) {
      const every = Math.max(1, Math.round(opts.everyMinutes ?? 10));
      const slot = `run-${every}m-${Math.floor(now.getTime() / (every * 60_000))}`;
      if (!(await claim(dir, slot))) return empty("another process has this run");
    }
    // Once a night the first scheduled run sends every row again (repairs any drift).
    const nightly = Boolean(opts.claimSlot) && now.getUTCHours() === NIGHTLY_HOUR_UTC && (await claim(dir, `full-${now.toISOString().slice(0, 10)}`));
    const full = Boolean(opts.full) || nightly;
    const [tables, standbyTables] = await Promise.all([listTables(primary), listTables(standby)]);
    const result: SyncResult = { ran: true, full, tables: [], written: 0, deleted: 0, bytes: 0, ms: 0 };
    for (const t of tables) {
      const twin = standbyTables.find((s) => s.name.toLowerCase() === t.name.toLowerCase());
      try {
        const r = await syncTable(primary, standby, { ...t, name: twin?.name ?? t.name }, twin?.columns ?? [], dir, full, now);
        result.tables.push(r);
        result.written += r.written;
        result.deleted += r.deleted;
        result.bytes += r.bytes;
      } catch (err) {
        result.tables.push({ table: t.name, rows: 0, written: 0, deleted: 0, mode: "skipped", error: err instanceof Error ? err.message.slice(0, 200) : String(err) });
      }
    }
    result.ms = Date.now() - started;
    const failed = result.tables.filter((t) => t.error);
    const line = `[standby-sync] ${full ? "Full" : "Incremental"} copy: ${result.written} row(s) written, ${result.deleted} deleted, ~${Math.round(result.bytes / 1024)} KB, ${result.tables.length} tables, ${result.ms} ms.`;
    if (failed.length) console.error(`${line} Failed: ${failed.map((t) => `${t.table} (${t.error})`).join("; ")}`);
    else if (result.written || result.deleted || full) console.info(line);
    await saveLastRun(dir, {
      at: now.toISOString(),
      ran: true,
      full,
      written: result.written,
      deleted: result.deleted,
      ms: result.ms,
      failed: failed.map((t) => ({ table: t.table, error: t.error ?? "" })),
    });
    return result;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[standby-sync] Run failed:", reason);
    await saveLastRun(dir, { at: now.toISOString(), ran: false, full: false, written: 0, deleted: 0, ms: Date.now() - started, reason: reason.slice(0, 300), failed: [] });
    return { ...empty(reason), ms: Date.now() - started };
  } finally {
    running = false;
  }
}

/** Deletes run markers older than a day. */
export async function pruneStandbySyncMarkers(dir = standbySyncDir(), now = Date.now()): Promise<void> {
  try {
    for (const name of await fs.readdir(dir)) {
      if (!name.startsWith("run-") && !name.startsWith("full-")) continue;
      const file = path.join(dir, name);
      const { mtimeMs } = await fs.stat(file);
      if (now - mtimeMs > 24 * 60 * 60_000) await fs.unlink(file);
    }
  } catch {
    // Nothing to tidy.
  }
}
