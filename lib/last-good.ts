/**
 * The last good copy of a public page's data, for when the database is unavailable.
 *
 * Public pages (teachers, notices, committee, events, …) load through lastGood(): while
 * the database works the result is remembered in memory and saved to
 * UPLOADS_DIR/.last-good/<key>.json, so every server process, and the next one after a
 * restart or deploy, has it. When the database fails (lib/db-errors.ts) the page shows
 * that copy instead of an empty list or an error page; DbOutageNotice tells visitors
 * the information may be a little old.
 *
 * Only data an anonymous visitor already sees goes in here. Admin pages never use it:
 * nobody should edit from a stale copy.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { isDbUnavailable } from "@/lib/db-errors";
import { uploadsRoot } from "@/lib/media/avatars";

/** Snapshot writes per key: only when the data changed, and at most this often. */
const WRITE_EVERY_MS = 60_000;
/** After a database-unavailable error, serve copies without asking the database. */
export const BREAKER_MS = 30_000;
const WARN_EVERY_MS = 60_000;

interface Copy {
  savedAt: number;
  json: string;
}

const memory = new Map<string, Copy>();
/** What this process last wrote to disk per key, and when. */
const lastWrite = new Map<string, { at: number; json: string }>();
const lastWarn = new Map<string, number>();
let breakerUntil = 0;

export function lastGoodDir(): string {
  return path.join(uploadsRoot(), ".last-good");
}

/** JSON that keeps Dates and BigInts. */
export function serialize(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    const raw = this[key];
    if (raw instanceof Date) return { $date: raw.toISOString() };
    if (typeof v === "bigint") return { $bigint: v.toString() };
    return v;
  });
}

export function deserialize<T>(json: string): T {
  return JSON.parse(json, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length === 1 && keys[0] === "$date" && typeof v.$date === "string") return new Date(v.$date);
      if (keys.length === 1 && keys[0] === "$bigint" && typeof v.$bigint === "string") return BigInt(v.$bigint);
    }
    return v;
  }) as T;
}

function fileFor(dir: string, key: string): string {
  return path.join(dir, `${key.replace(/[^a-z0-9_-]/gi, "_")}.json`);
}

async function save(dir: string, key: string, copy: Copy): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const file = fileFor(dir, key);
  // Written aside and renamed: another process never reads half a file.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(copy));
  await fs.rename(tmp, file);
}

async function load(dir: string, key: string): Promise<Copy | null> {
  try {
    const copy = JSON.parse(await fs.readFile(fileFor(dir, key), "utf8")) as Copy;
    return typeof copy.savedAt === "number" && typeof copy.json === "string" ? copy : null;
  } catch {
    return null;
  }
}

export interface LastGoodOptions {
  /** A copy older than this is not shown; the fallback is. */
  maxAgeDays?: number;
  dir?: string;
  now?: () => number;
}

/**
 * Runs `loader` and remembers its result; when the database is unavailable, returns the
 * last good result instead (memory, then disk), or `fallback` when there is none.
 * Any other error is logged and gives `fallback`, as the pages' old `.catch()` did.
 */
export async function lastGood<T>(key: string, loader: () => Promise<T>, fallback: T, opts: LastGoodOptions = {}): Promise<T> {
  const dir = opts.dir ?? lastGoodDir();
  const now = (opts.now ?? Date.now)();
  const maxAgeMs = (opts.maxAgeDays ?? 14) * 24 * 60 * 60_000;

  const fromCopy = async (): Promise<T> => {
    let copy = memory.get(key) ?? null;
    if (!copy) {
      copy = await load(dir, key);
      if (copy) memory.set(key, copy);
    }
    if (!copy || now - copy.savedAt > maxAgeMs) return fallback;
    return deserialize<T>(copy.json);
  };

  if (now < breakerUntil) return fromCopy();

  try {
    const value = await loader();
    try {
      const json = serialize(value);
      const copy = { savedAt: now, json };
      memory.set(key, copy);
      const last = lastWrite.get(key);
      const changed = !last || last.json !== json;
      const due = !last || now - last.at >= WRITE_EVERY_MS;
      if (changed && due) {
        lastWrite.set(key, { at: now, json });
        await save(dir, key, copy).catch((err) => console.warn(`[last-good] Could not save ${key}:`, err instanceof Error ? err.message : err));
      }
    } catch (err) {
      console.warn(`[last-good] Could not copy ${key}:`, err instanceof Error ? err.message : err);
    }
    return value;
  } catch (err) {
    if (isDbUnavailable(err)) {
      breakerUntil = now + BREAKER_MS;
      if (now - (lastWarn.get(key) ?? 0) >= WARN_EVERY_MS) {
        lastWarn.set(key, now);
        console.warn(`[last-good] Database unavailable; showing the saved copy of ${key}.`);
      }
      return fromCopy();
    }
    console.error(`[last-good] ${key} failed:`, err);
    return fallback;
  }
}

/** Tests only: forget memory copies, write times and the breaker. */
export function resetLastGood(): void {
  memory.clear();
  lastWrite.clear();
  lastWarn.clear();
  breakerUntil = 0;
}
