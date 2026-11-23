/**
 * Measures how long one database query takes from this server, for the main database
 * and for the standby, and how many connections each has open, and logs it
 * (lib/standby-sync.ts calls it once an hour).
 *
 * Why: every page runs several queries one after another, so each query's round trip
 * adds up. The numbers show what a page would cost if the standby (TiDB Cloud,
 * Singapore) were the main database instead of the one on this server. Reads only.
 */
import type { PrismaClient } from "@prisma/client";

export interface LatencyStats {
  /** The first query (may include opening a connection). */
  first: number;
  median: number;
  p95: number;
  min: number;
  samples: number;
}

/** Milliseconds, rounded to 0.1. */
const round = (ms: number) => Math.round(ms * 10) / 10;

export function latencyStats(times: number[]): LatencyStats {
  if (times.length === 0) return { first: 0, median: 0, p95: 0, min: 0, samples: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
  return { first: round(times[0]), median: round(at(0.5)), p95: round(at(0.95)), min: round(sorted[0]), samples: times.length };
}

type Query = (db: PrismaClient) => Promise<unknown>;

/** A bare round trip. */
export const pingQuery: Query = (db) => db.$queryRawUnsafe("SELECT 1");
/** A small read through Prisma, like a page makes (setting keys hold no member data). */
export const readQuery: Query = (db) => db.setting.findMany({ take: 20, select: { key: true }, orderBy: { key: "asc" } });

/** Runs a query `runs` times one after another and times each. */
export async function timeQuery(db: PrismaClient, query: Query, runs = 10): Promise<LatencyStats> {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await query(db);
    times.push(performance.now() - start);
  }
  return latencyStats(times);
}

/**
 * How many connections this database user has open right now, from every process of
 * this site (Hostinger revokes permissions when there are too many). null if unknown.
 */
export async function openConnections(db: PrismaClient): Promise<number | null> {
  try {
    const [row] = await db.$queryRawUnsafe<{ n: number | bigint }[]>(
      "SELECT COUNT(*) AS n FROM information_schema.PROCESSLIST WHERE USER = SUBSTRING_INDEX(CURRENT_USER(), '@', 1)"
    );
    return row ? Number(row.n) : null;
  } catch {
    return null;
  }
}

/**
 * The connection limits the database applies to this user: per-user limits from its
 * grants (MAX_USER_CONNECTIONS, MAX_CONNECTIONS_PER_HOUR; 0 or missing = none set there)
 * and the server-wide ones. Only the numbers are kept. null if unreadable.
 */
export async function connectionLimits(db: PrismaClient): Promise<string | null> {
  try {
    const [vars] = await db.$queryRawUnsafe<{ u: number | bigint; m: number | bigint; w: number | bigint }[]>(
      "SELECT @@max_user_connections AS u, @@max_connections AS m, @@wait_timeout AS w"
    );
    let grants = "";
    try {
      const rows = await db.$queryRawUnsafe<Record<string, string>[]>("SHOW GRANTS FOR CURRENT_USER()");
      grants = rows.map((r) => String(Object.values(r)[0])).join(" ");
    } catch {
      // Some servers hide grants; the server-wide numbers still help.
    }
    const own = (name: string) => grants.match(new RegExp(`${name}\\s+(\\d+)`, "i"))?.[1] ?? "-";
    return `user max_user_connections ${own("MAX_USER_CONNECTIONS")}, max_connections_per_hour ${own("MAX_CONNECTIONS_PER_HOUR")}; server max_user_connections ${Number(vars.u)}, max_connections ${Number(vars.m)}, wait_timeout ${Number(vars.w)}s`;
  } catch {
    return null;
  }
}

interface SideReport {
  limits?: string | null;
  connections: number | null;
  ping: LatencyStats;
  read: LatencyStats;
}

export interface LatencyReport {
  main: SideReport;
  standby: SideReport;
}

export function latencyLine(r: LatencyReport): string {
  const side = (name: string, s: SideReport) =>
    `${name}: ${s.connections ?? "?"} open connection(s), ping median ${s.ping.median} ms (p95 ${s.ping.p95}, min ${s.ping.min}, first ${s.ping.first}), read median ${s.read.median} ms (p95 ${s.read.p95})${s.limits ? ` [limits: ${s.limits}]` : ""}`;
  return `[db-latency] ${side("main", r.main)} | ${side("standby", r.standby)}.`;
}

async function measure(db: PrismaClient, runs: number): Promise<SideReport> {
  const ping = await timeQuery(db, pingQuery, runs);
  const read = await timeQuery(db, readQuery, runs);
  return { connections: await openConnections(db), ping, read };
}

/** Measures both databases and logs one line. Never throws. */
export async function logDbLatency(primary: PrismaClient, standby: PrismaClient, runs = 10): Promise<LatencyReport | null> {
  try {
    const report: LatencyReport = { main: { ...(await measure(primary, runs)), limits: await connectionLimits(primary) }, standby: await measure(standby, runs) };
    console.info(latencyLine(report));
    return report;
  } catch (err) {
    console.error("[db-latency] Measuring failed:", err instanceof Error ? err.message.slice(0, 200) : String(err));
    return null;
  }
}
