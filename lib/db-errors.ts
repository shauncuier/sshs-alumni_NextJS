/**
 * Recognises "the database is unavailable" errors, as opposed to bugs or bad input.
 *
 * Two kinds, as the live host has shown them:
 * - permission: the host dropped the database user's grants (MySQL 1142 "SELECT command
 *   denied", 1044 "access denied to database");
 * - down: the server cannot be reached, refuses the login or the pool is exhausted.
 *
 * Used by the watchdog, the saved-copy fallback (lib/last-good.ts), the standby switch
 * (lib/db-mode.ts) and errorResponse, so they never disagree about what counts.
 */
const PERMISSION = /\b(1142|1143|1044)\b|command denied|access denied for user .+ to database/i;
const DOWN =
  /\b(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ECONNRESET|EPIPE|PROTOCOL_CONNECTION_LOST|ER_CON_COUNT_ERROR|ER_GET_CONNECTION_TIMEOUT|P1001|P1002|P1017|P2024|1040|1045|1049|1053|2002|2003|2006|2013|45009|45012|45028)\b|too many connections|can't reach database|cannot reach database|pool timeout|retrieve (a )?connection from (the )?pool|connection timeout|socket has unexpectedly been closed|connection closed|server has gone away|lost connection|access denied for user|unknown database|database not ready/i;

/** Message, code and causes of an error, joined, so wrapped driver errors are seen too. */
function describe(err: unknown, depth = 0): string {
  if (err == null || depth > 4) return "";
  if (typeof err !== "object") return String(err);
  const e = err as { message?: unknown; code?: unknown; errno?: unknown; cause?: unknown; meta?: { driverAdapterError?: unknown } };
  const parts = [e.message, e.code, e.errno].filter((v) => v != null && typeof v !== "object").map(String);
  // Prisma 7 puts the driver's own error (code, message, cause) in meta.driverAdapterError.
  return [parts.join(" "), describe(e.meta?.driverAdapterError, depth + 1), describe(e.cause, depth + 1)].filter(Boolean).join(" | ");
}

export const DB_UNAVAILABLE_MESSAGE = "The site is briefly unavailable. Please try again in a few minutes.";

/** True when the error means the database cannot be used right now (not a bug, not bad input). */
export function isDbUnavailable(err: unknown): boolean {
  if (err && typeof err === "object" && (err as { name?: string }).name === "AppError") {
    // lib/prisma.ts turns outages into AppError("DB_UNAVAILABLE"), so routes show a plain message.
    return (err as { code?: string }).code === "DB_UNAVAILABLE";
  }
  const text = describe(err);
  return PERMISSION.test(text) || DOWN.test(text);
}

/**
 * The server itself refused us: it took away the user's permissions, or no connection
 * could be opened at all (refused, unreachable, or the TCP connect timed out — the live
 * host's "failed to create socket after 5000ms"). One such error is enough to know the
 * database is out. A pool that is merely busy (all its connections in use) is not.
 */
const CANNOT_CONNECT =
  /\b(ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|P1001|2002|2003|45012)\b|failed to create socket|can't reach database|cannot reach database/i;

export function isHardDbOutage(err: unknown): boolean {
  const text = describe(err);
  return PERMISSION.test(text) || CANNOT_CONNECT.test(text);
}

/** Which kind of outage: lost permissions (fix in hPanel) or no connection at all. */
export function dbReason(err: unknown): "permission" | "down" {
  return PERMISSION.test(describe(err)) ? "permission" : "down";
}

/**
 * One line for logs and alerts, without newlines: the database's own message when Prisma
 * wrapped it (its "Invalid `prisma.x()` invocation" text quotes source code, not the cause).
 */
export function dbErrorDetail(err: unknown): string {
  const meta = (err as { meta?: { driverAdapterError?: { cause?: { code?: unknown; message?: unknown; cause?: unknown } } } } | null)?.meta;
  const cause = meta?.driverAdapterError?.cause;
  const text = cause?.message ? [cause.code, cause.message, typeof cause.cause === "string" ? cause.cause : ""].filter(Boolean).join(" ") : describe(err);
  return String(text).replace(/\s+/g, " ").slice(0, 300);
}
