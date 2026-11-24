/**
 * Which database the site reads: the main one ("primary") or the standby copy
 * ("standby", read-only). See lib/prisma.ts for the switch itself and
 * lib/standby-sync.ts for how the copy is kept up to date.
 *
 * - One error showing the server refused us (no connection could be opened, or lost
 *   permissions: isHardDbOutage in lib/db-errors.ts) switches this process to the
 *   standby, when one is configured (STANDBY_DATABASE_URL). Other "database unavailable"
 *   errors (a busy pool) need two within a minute. Each process makes only about one
 *   query a minute on a quiet site, so on 2026-11-24 10:50 UTC "two within a minute"
 *   took 86 s to happen while signed-in members saw errors.
 * - While on the standby, the main database is tried every 30 seconds; it must answer
 *   six times in a row (about 3 minutes) before the site switches back. On 2026-11-24 it
 *   switched back after two good answers and failed again 30 s later.
 * - The mode is also written to UPLOADS_DIR/.db-mode.json, so the other server processes
 *   follow within a few seconds instead of each waiting for its own failures.
 *
 * This module does not import the Prisma client (that would be circular): lib/prisma.ts
 * registers the check used to try the main database.
 */
import fs from "node:fs";
import path from "node:path";

// Same folder as uploadsRoot() in lib/media/avatars.ts, without loading that module
// (and sharp) wherever the Prisma client is used.
function uploadsRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
}

export type DbMode = "primary" | "standby";

export const SWITCH_AFTER_FAILURES = 2;
export const FAILURE_WINDOW_MS = 60_000;
export const PROBE_EVERY_MS = 30_000;
export const BACK_AFTER_PASSES = 6;
const FILE_CHECK_MS = 5_000;

interface ModeFile {
  mode: DbMode;
  since: string;
}

const state = {
  mode: "primary" as DbMode,
  since: new Date(0),
  failures: [] as number[],
  fileCheckedAt: 0,
  probe: null as ReturnType<typeof setInterval> | null,
  passes: 0,
  probing: false,
};

let primaryCheck: (() => Promise<void>) | null = null;

export function standbyConfigured(): boolean {
  return Boolean(process.env.STANDBY_DATABASE_URL?.trim());
}

function modeFile(): string {
  return path.join(uploadsRoot(), ".db-mode.json");
}

function writeModeFile(mode: DbMode, since: Date): void {
  try {
    const file = modeFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ mode, since: since.toISOString() } satisfies ModeFile));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.warn("[db-mode] Could not save the mode:", err instanceof Error ? err.message : err);
  }
}

/** Follows a switch another process made (at most one small file read every 5 seconds). */
function followOtherProcesses(now: number): void {
  if (now - state.fileCheckedAt < FILE_CHECK_MS) return;
  state.fileCheckedAt = now;
  try {
    const saved = JSON.parse(fs.readFileSync(modeFile(), "utf8")) as ModeFile;
    const since = new Date(saved.since);
    if ((saved.mode === "primary" || saved.mode === "standby") && since > state.since && saved.mode !== state.mode) {
      apply(saved.mode, since, false);
    }
  } catch {
    // No file yet: nobody has switched.
  }
}

function apply(mode: DbMode, since: Date, save: boolean): void {
  state.mode = mode;
  state.since = since;
  state.failures = [];
  state.passes = 0;
  if (save) writeModeFile(mode, since);
  if (mode === "standby") startProbe();
  else stopProbe();
}

/** The database the site should read right now. */
export function currentMode(now = Date.now()): DbMode {
  if (!standbyConfigured()) return "primary";
  followOtherProcesses(now);
  return state.mode;
}

export function setMode(mode: DbMode, now = new Date()): void {
  if (mode === state.mode) return;
  if (mode === "standby") {
    console.error("[db-mode] The main database is unavailable: switching to the standby copy (read-only).");
  } else {
    console.info("[db-mode] The main database works again: switching back from the standby.");
  }
  apply(mode, now, true);
}

/**
 * Records a database-unavailable error from the main database; `hard` (isHardDbOutage)
 * switches at once. Returns true when the site now reads the standby (it switched, or
 * already had).
 */
export function noteDbFailure(now = Date.now(), hard = false): boolean {
  if (!standbyConfigured()) return false;
  if (currentMode(now) === "standby") return true;
  state.failures = state.failures.filter((t) => now - t < FAILURE_WINDOW_MS);
  state.failures.push(now);
  if (hard || state.failures.length >= SWITCH_AFTER_FAILURES) {
    setMode("standby", new Date(now));
    return true;
  }
  return false;
}

/** lib/prisma.ts registers how to try the main database (one real table read). */
export function registerPrimaryCheck(check: () => Promise<void>): void {
  primaryCheck = check;
}

/** One try of the main database while on the standby; exported for tests. */
export async function probePrimary(now = new Date()): Promise<DbMode> {
  if (state.mode !== "standby" || !primaryCheck || state.probing) return state.mode;
  state.probing = true;
  try {
    await primaryCheck();
    state.passes += 1;
    if (state.passes >= BACK_AFTER_PASSES) setMode("primary", now);
  } catch {
    state.passes = 0;
  } finally {
    state.probing = false;
  }
  return state.mode;
}

function startProbe(): void {
  if (state.probe || process.env.NODE_ENV === "test") return;
  state.probe = setInterval(() => void probePrimary(), PROBE_EVERY_MS);
  state.probe.unref?.();
}

function stopProbe(): void {
  if (state.probe) clearInterval(state.probe);
  state.probe = null;
}

/** Tests only. */
export function resetDbMode(): void {
  stopProbe();
  state.mode = "primary";
  state.since = new Date(0);
  state.failures = [];
  state.fileCheckedAt = 0;
  state.passes = 0;
  state.probing = false;
}
