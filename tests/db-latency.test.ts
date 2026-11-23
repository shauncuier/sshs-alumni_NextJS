import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prisma, { PRIMARY_POOL_DEFAULTS, standbyUrl, withPoolDefaults, withSessionCollation } from "@/lib/prisma";
import { latencyLine, latencyStats, logDbLatency, pingQuery, timeQuery } from "@/lib/db-latency";
import { runStandbySync } from "@/lib/standby-sync";

describe("main database pool limits", () => {
  it("adds small pool limits the URL does not set, leaving the rest of the URL alone", () => {
    const url = withPoolDefaults("mysql://u:p%40ss%23word@127.0.0.1:3306/db", PRIMARY_POOL_DEFAULTS);
    expect(url).toBe("mysql://u:p%40ss%23word@127.0.0.1:3306/db?connectionLimit=5&minimumIdle=1&idleTimeout=300");
    const own = new URL(withPoolDefaults("mysql://u:p@127.0.0.1:3306/db?connectionLimit=8", PRIMARY_POOL_DEFAULTS));
    expect(own.searchParams.get("connectionLimit")).toBe("8");
    expect(own.searchParams.get("minimumIdle")).toBe("1");
    const standby = new URL(standbyUrl("mysql://a.root:x@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sshs_standby"));
    expect([standby.searchParams.get("connectionLimit"), standby.searchParams.get("minimumIdle"), standby.searchParams.get("idleTimeout")]).toEqual(["3", "1", "300"]);
  });

  it("the driver keeps to the limit under load", async () => {
    const db = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(withPoolDefaults(process.env.DATABASE_URL!, PRIMARY_POOL_DEFAULTS))) });
    try {
      const rows = await Promise.all(Array.from({ length: 20 }, () => db.$queryRawUnsafe<{ id: bigint }[]>("SELECT CONNECTION_ID() AS id, SLEEP(0.1) AS s")));
      const ids = new Set(rows.map((r) => String(r[0].id)));
      expect(ids.size).toBeGreaterThan(1);
      expect(ids.size).toBeLessThanOrEqual(5);
    } finally {
      await db.$disconnect();
    }
  });

  it("closes idle connections down to one", async () => {
    // Same rules with a 2-second idle time instead of 300, so the test is quick.
    const url = withPoolDefaults(process.env.DATABASE_URL! + (process.env.DATABASE_URL!.includes("?") ? "&" : "?") + "idleTimeout=2", PRIMARY_POOL_DEFAULTS);
    const db = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(url)) });
    try {
      const rows = await Promise.all(Array.from({ length: 10 }, () => db.$queryRawUnsafe<{ id: bigint }[]>("SELECT CONNECTION_ID() AS id, SLEEP(0.1) AS s")));
      const ids = [...new Set(rows.map((r) => String(r[0].id)))];
      expect(ids.length).toBeGreaterThan(1);
      await new Promise((r) => setTimeout(r, 6_000));
      const alive = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM information_schema.PROCESSLIST WHERE ID IN (${ids.join(",")})`);
      expect(Number(alive[0].n)).toBeLessThanOrEqual(1);
    } finally {
      await db.$disconnect();
    }
  }, 20_000);
});

describe("query timing", () => {
  it("works out first, median, p95 and min", () => {
    expect(latencyStats([30, 10, 20, 40, 50, 60, 70, 80, 90, 100])).toEqual({ first: 30, median: 50, p95: 100, min: 10, samples: 10 });
    expect(latencyStats([1.234])).toEqual({ first: 1.2, median: 1.2, p95: 1.2, min: 1.2, samples: 1 });
    expect(latencyStats([]).samples).toBe(0);
  });

  it("times real queries and logs one line for both databases", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const standby = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(process.env.TEST_STANDBY_DATABASE_URL!)) });
    try {
      const ping = await timeQuery(prisma, pingQuery, 3);
      expect(ping.samples).toBe(3);
      expect(ping.median).toBeGreaterThanOrEqual(0);
      const report = await logDbLatency(prisma, standby, 3);
      expect(report?.standby.read.samples).toBe(3);
      expect(info).toHaveBeenCalledWith(latencyLine(report!));
      expect(report?.main.connections).toBeGreaterThanOrEqual(1);
      expect(report?.main.limits).toMatch(/^user max_user_connections [\d-]+, max_connections_per_hour [\d-]+; server max_user_connections \d+, max_connections \d+, wait_timeout \d+s$/);
      expect(latencyLine(report!)).toContain("[limits: user max_user_connections");
      expect(latencyLine(report!)).toMatch(/^\[db-latency\] main: \d+ open connection\(s\), ping median [\d.]+ ms .* \| standby: \d+ open connection\(s\), ping median [\d.]+ ms .*read median [\d.]+ ms/);
    } finally {
      await standby.$disconnect();
      info.mockRestore();
    }
  });

  it("never throws when a database is down", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = { $queryRawUnsafe: async () => { throw new Error("Can't reach database"); } } as unknown as PrismaClient;
    expect(await logDbLatency(prisma, broken, 2)).toBeNull();
    expect(error).toHaveBeenCalledWith("[db-latency] Measuring failed:", "Can't reach database");
    error.mockRestore();
  });

  it("scheduled copies log it once an hour; manual copies never", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "standby-latency-"));
    const standby = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(process.env.TEST_STANDBY_DATABASE_URL!)) });
    const lines = () => info.mock.calls.filter((c) => String(c[0]).startsWith("[db-latency]")).length;
    const run = (iso: string, claimSlot = true) => runStandbySync({ primary: prisma, standby, dir, now: new Date(iso), claimSlot, everyMinutes: 2 });
    try {
      await run("2026-11-23T10:00:10Z");
      await run("2026-11-23T10:02:10Z");
      expect(lines()).toBe(1);
      await run("2026-11-23T11:00:10Z");
      expect(lines()).toBe(2);
      await run("2026-11-23T12:00:10Z", false);
      expect(lines()).toBe(2);
    } finally {
      await standby.$disconnect();
      await fs.rm(dir, { recursive: true, force: true });
      info.mockRestore();
    }
  });
});
