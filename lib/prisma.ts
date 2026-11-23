import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { AppError } from "@/lib/app-error";
import { DB_UNAVAILABLE_MESSAGE, dbErrorDetail, isDbUnavailable } from "@/lib/db-errors";
import { currentMode, noteDbFailure, registerPrimaryCheck } from "@/lib/db-mode";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Stands in for PrismaClient when it cannot be created, so imports still work
// and every query rejects with the reason instead of crashing at module load.
function createNotReadyProxy(reason: string): PrismaClient {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        return new Proxy(
          {},
          {
            get() {
              return async () => {
                throw new Error(`Database not ready: ${reason} (accessing prisma.${String(prop)})`);
              };
            },
          }
        );
      },
    }
  ) as unknown as PrismaClient;
}

function notReady(reason: string): { client: PrismaClient; ready: false } {
  console.error(`${reason} Database calls will fail.`);
  return { client: createNotReadyProxy(reason), ready: false };
}

// DATABASE_URL is the single source of truth, shared with prisma.config.ts.
// The adapter takes the URL as-is: it rewrites mysql:// to mariadb://, unwraps
// bracketed IPv6 hosts, and passes query parameters (e.g. ?ssl=true,
// ?connectionLimit=5, ?connectTimeout=10000) through as MariaDB pool options.
// MariaDB 11 (Hostinger) binds string parameters as utf8mb4_general_ci while literals
// follow the connection collation, so Prisma's `LIKE CONCAT(?, '%')` (startsWith,
// contains) fails with "Illegal mix of collations". Giving the session the same
// collation as the parameters fixes it; column collations still decide comparisons.
// Both options are appended as text: if the adapter has to add prepareCacheLength
// itself it re-encodes the query with '+' for spaces, which the driver does not decode.
const SESSION_SQL = "SET NAMES utf8mb4 COLLATE utf8mb4_general_ci";
export function withSessionCollation(databaseUrl: string): string {
  const params = new URL(databaseUrl).searchParams;
  if (params.has("initSql")) return databaseUrl;
  const extra = [`initSql=${encodeURIComponent(SESSION_SQL)}`];
  if (!params.has("prepareCacheLength")) extra.push("prepareCacheLength=0");
  return databaseUrl + (databaseUrl.includes("?") ? "&" : "?") + extra.join("&");
}

/**
 * Pool limits for the main database. Hostinger revokes the database user's permissions
 * (MySQL 1142) when it holds too many connections at once. The MariaDB driver's defaults
 * are 10 connections per pool, all kept open for good (minimumIdle = connectionLimit),
 * and the live server runs several pools (more than one process, and Next.js can load
 * this module more than once), so it sat at dozens of idle connections. Now each pool
 * opens at most 5, keeps 1 open while idle, and closes the rest after 5 minutes idle.
 * Not sooner: Hostinger also caps new connections per hour (max_connections_per_hour,
 * 500 in their docs), and closing quickly would mean reopening often.
 * A value already in DATABASE_URL wins.
 */
export const PRIMARY_POOL_DEFAULTS: Record<string, string> = { connectionLimit: "5", minimumIdle: "1", idleTimeout: "300" };
/** The standby (TiDB) gets the same idle rules with a smaller pool (see standbyUrl). */
export const STANDBY_POOL_DEFAULTS: Record<string, string> = { connectionLimit: "3", minimumIdle: "1", idleTimeout: "300" };

/** Adds pool options the URL does not set. Appended as text so the rest of the URL (the password) is untouched. */
export function withPoolDefaults(databaseUrl: string, defaults: Record<string, string>): string {
  const params = new URL(databaseUrl).searchParams;
  const extra = Object.entries(defaults)
    .filter(([key]) => !params.has(key))
    .map(([key, value]) => `${key}=${value}`);
  if (extra.length === 0) return databaseUrl;
  return databaseUrl + (databaseUrl.includes("?") ? "&" : "?") + extra.join("&");
}

function createClient(databaseUrl: string | undefined, name = "DATABASE_URL"): { client: PrismaClient; ready: boolean } {
  if (!databaseUrl) return notReady(`${name} is not set.`);

  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    return notReady(`${name} is not a valid URL.`);
  }
  if (protocol !== "mysql:" && protocol !== "mariadb:") {
    return notReady(`${name} must use mysql:// or mariadb://, got ${protocol}//.`);
  }

  try {
    const client = new PrismaClient({
      adapter: new PrismaMariaDb(withSessionCollation(databaseUrl)),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    return { client, ready: true };
  } catch (err) {
    return notReady(`PrismaClient failed to initialize: ${(err as Error).message}`);
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The standby URL as the MariaDB driver wants it. Hosted MySQL services (TiDB Cloud)
 * give URLs with their own TLS parameters (ssl-mode, sslaccept, …) that the driver does
 * not know: those are dropped and TLS with certificate checks is switched on for any
 * host that is not this machine. A small pool and a short connect timeout keep a slow
 * standby from tying up the server.
 */
export function standbyUrl(raw: string): string {
  const url = new URL(raw.trim());
  for (const key of [...url.searchParams.keys()]) {
    if (/^(ssl[-_]?mode|sslaccept|sslcert|sslidentity|sslpassword|ssl[-_]?ca|tls)$/i.test(key)) url.searchParams.delete(key);
  }
  if (!LOCAL_HOSTS.has(url.hostname) && !url.searchParams.has("ssl")) url.searchParams.set("ssl", "true");
  for (const [key, value] of Object.entries(STANDBY_POOL_DEFAULTS)) if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  if (!url.searchParams.has("connectTimeout")) url.searchParams.set("connectTimeout", "10000");
  return url.toString();
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const raw = process.env.DATABASE_URL;
  let url = raw;
  try {
    if (raw) url = withPoolDefaults(raw, PRIMARY_POOL_DEFAULTS);
  } catch {
    // createClient reports the bad URL.
  }
  const { client, ready } = createClient(url);
  // One client (one pool) per process, also in production: Next.js can evaluate this
  // module more than once, and every copy would open its own pool. Caching the not-ready
  // proxy would keep failing after DATABASE_URL is fixed, until a restart.
  if (ready) globalForPrisma.prisma = client;
  return client;
}

const globalForStandby = globalThis as unknown as { standbyPrisma?: PrismaClient };

function getStandbyClient(): PrismaClient | null {
  const raw = process.env.STANDBY_DATABASE_URL?.trim();
  if (!raw) return null;
  if (globalForStandby.standbyPrisma) return globalForStandby.standbyPrisma;
  let url: string;
  try {
    url = standbyUrl(raw);
  } catch {
    console.error("STANDBY_DATABASE_URL is not a valid URL; running without a standby.");
    return null;
  }
  const { client, ready } = createClient(url, "STANDBY_DATABASE_URL");
  if (!ready) return null;
  globalForStandby.standbyPrisma = client;
  return client;
}

const primaryInstance = getClient();
const standbyInstance = getStandbyClient();

/** The main database, never the standby: for the watchdog, the standby copy job and probes. */
export function primaryClient(): PrismaClient {
  return primaryInstance;
}

/** The standby copy, or null when STANDBY_DATABASE_URL is not set. Writes here bypass the read-only guard: only the copy job may use it for writing. */
export function standbyClient(): PrismaClient | null {
  return standbyInstance;
}

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
  "$executeRaw",
  "$executeRawUnsafe",
  // Raw reads here only lock rows inside write transactions (SELECT … FOR UPDATE).
  "$queryRaw",
  "$queryRawUnsafe",
]);

export function isWriteOperation(operation: string): boolean {
  return WRITE_OPERATIONS.has(operation);
}

export const READ_ONLY_MESSAGE = "Saving is paused for a few minutes while we fix a problem with the database. Please try again soon.";

export function readOnlyError(): AppError {
  return new AppError("READ_ONLY", 503, READ_ONLY_MESSAGE);
}

/** After the standby fails too, calls fail at once for this long instead of each waiting for a connection. */
const STANDBY_BREAKER_MS = 30_000;
let standbyDownUntil = 0;

/** Runs one Prisma operation on the standby, refusing writes. */
async function onStandby(standby: PrismaClient, model: string | undefined, operation: string, args: unknown): Promise<unknown> {
  if (!model || isWriteOperation(operation)) throw readOnlyError();
  if (Date.now() < standbyDownUntil) throw new AppError("DB_UNAVAILABLE", 503, DB_UNAVAILABLE_MESSAGE);
  const delegate = (standby as unknown as Record<string, Record<string, (a: unknown) => Promise<unknown>>>)[model.charAt(0).toLowerCase() + model.slice(1)];
  if (!delegate?.[operation]) throw readOnlyError();
  try {
    return await delegate[operation](args);
  } catch (err) {
    // The standby is unreachable too: the same plain 503 as without a standby.
    if (isDbUnavailable(err) && !(err instanceof AppError)) {
      standbyDownUntil = Date.now() + STANDBY_BREAKER_MS;
      throw unavailable(err);
    }
    throw err;
  }
}

let lastOutageLog = 0;

/** The outage as an AppError, so routes answer 503 "try again in a few minutes" instead of 500. */
function unavailable(err: unknown): AppError {
  const now = Date.now();
  if (now - lastOutageLog > 60_000) {
    lastOutageLog = now;
    console.error("[prisma] Database unavailable:", dbErrorDetail(err));
  }
  const appErr = new AppError("DB_UNAVAILABLE", 503, DB_UNAVAILABLE_MESSAGE);
  (appErr as Error & { cause?: unknown }).cause = err;
  return appErr;
}

/**
 * Every operation goes to the main database. When it is unavailable (lib/db-errors.ts):
 * - with a standby (STANDBY_DATABASE_URL), lib/db-mode.ts may switch to it; from then on
 *   reads go to the standby copy and writes are refused with READ_ONLY until the main
 *   database answers again;
 * - otherwise, or for a write, the error becomes AppError("DB_UNAVAILABLE", 503), which
 *   routes already turn into a plain message.
 * Other errors (unique constraints, bugs) pass through unchanged.
 */
function withFailover(primary: PrismaClient, standby: PrismaClient | null): PrismaClient {
  registerPrimaryCheck(async () => {
    await primary.user.findFirst({ select: { id: true } });
  });
  return primary.$extends({
    name: "db-outage",
    query: {
      async $allOperations({ model, operation, args, query }) {
        if (standby && currentMode() === "standby") return onStandby(standby, model, operation, args);
        try {
          return await query(args);
        } catch (err) {
          if (!isDbUnavailable(err) || err instanceof AppError) throw err;
          const switched = standby ? noteDbFailure() : false;
          if (standby && switched) {
            if (model && !isWriteOperation(operation)) return onStandby(standby, model, operation, args);
            throw readOnlyError();
          }
          throw unavailable(err);
        }
      },
    },
  }) as unknown as PrismaClient;
}

// The not-ready stand-in (DATABASE_URL missing) has no $extends: leave it as it is.
export const prisma =
  typeof (primaryInstance as unknown as { $extends?: unknown }).$extends === "function" ? withFailover(primaryInstance, standbyInstance) : primaryInstance;
export default prisma;
