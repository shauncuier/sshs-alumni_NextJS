import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { AppError } from "@/lib/app-error";

// vi.resetModules() loads a fresh AppError class, so check by name rather than instanceof.
const isAppError = (e: unknown): e is AppError => (e as { name?: string })?.name === "AppError";

/**
 * The real switch in lib/prisma.ts, with a main database that cannot be reached (a closed
 * port, like the host refusing us) and the standby test database (sshs_standby_test).
 */
const DEAD_PRIMARY = "mysql://root:x@127.0.0.1:1/nowhere_test?connectTimeout=300&acquireTimeout=800";
const KEY = "failover-test";

type PrismaModule = typeof import("@/lib/prisma");
type ModeModule = typeof import("@/lib/db-mode");

const saved = { db: process.env.DATABASE_URL, standby: process.env.STANDBY_DATABASE_URL };
const g = globalThis as unknown as { prisma?: PrismaClient; standbyPrisma?: PrismaClient };
const savedClients = { prisma: g.prisma, standby: g.standbyPrisma };

async function load(db: string, standby: string): Promise<{ lib: PrismaModule; mode: ModeModule }> {
  process.env.DATABASE_URL = db;
  process.env.STANDBY_DATABASE_URL = standby;
  delete g.prisma;
  delete g.standbyPrisma;
  vi.resetModules();
  const lib = await import("@/lib/prisma");
  const mode = await import("@/lib/db-mode");
  mode.resetDbMode();
  return { lib, mode };
}

afterAll(() => {
  process.env.DATABASE_URL = saved.db;
  process.env.STANDBY_DATABASE_URL = saved.standby;
  g.prisma = savedClients.prisma;
  g.standbyPrisma = savedClients.standby;
  fs.rmSync(path.join(process.env.UPLOADS_DIR!, ".db-mode.json"), { force: true });
  vi.resetModules();
});

describe("standby failover", () => {
  let lib: PrismaModule;
  let mode: ModeModule;

  beforeAll(async () => {
    ({ lib, mode } = await load(DEAD_PRIMARY, process.env.TEST_STANDBY_DATABASE_URL!));
    await lib.standbyClient()!.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: "from the standby" }, update: { value: "from the standby" } });
  });

  afterAll(async () => {
    await lib.standbyClient()!.setting.deleteMany({ where: { key: KEY } });
    await lib.standbyClient()!.$disconnect();
    mode.resetDbMode();
  });

  it("switches to the standby on the second outage error and reads from it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await lib.prisma.setting.findUnique({ where: { key: KEY } }).catch((e) => e);
    expect(isAppError(first)).toBe(true);
    expect((first as AppError).code).toBe("DB_UNAVAILABLE");
    expect((first as AppError).status).toBe(503);
    expect(mode.currentMode()).toBe("primary");

    const second = await lib.prisma.setting.findUnique({ where: { key: KEY } });
    expect(second?.value).toBe("from the standby");
    expect(mode.currentMode()).toBe("standby");

    // From now on reads go straight to the standby.
    expect((await lib.prisma.setting.findMany({ where: { key: KEY } })).length).toBe(1);
    expect(await lib.prisma.setting.count({ where: { key: KEY } })).toBe(1);
  });

  it("refuses every kind of write on the standby with READ_ONLY", async () => {
    expect(mode.currentMode()).toBe("standby");
    const attempts = [
      lib.prisma.setting.create({ data: { key: "nope", value: "x" } }),
      lib.prisma.setting.update({ where: { key: KEY }, data: { value: "changed" } }),
      lib.prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: "x" }, update: { value: "x" } }),
      lib.prisma.setting.deleteMany({ where: { key: KEY } }),
      lib.prisma.$executeRaw`UPDATE \`Setting\` SET \`value\` = 'x'`,
    ];
    for (const attempt of attempts) {
      const err = await attempt.catch((e) => e);
      expect(isAppError(err)).toBe(true);
      expect((err as AppError).code).toBe("READ_ONLY");
    }
    const still = await lib.standbyClient()!.setting.findUnique({ where: { key: KEY } });
    expect(still?.value).toBe("from the standby");
  });

  it("stays on the standby while the main database is still down", async () => {
    expect(await mode.probePrimary()).toBe("standby");
  });
});

describe("when the standby is down too", () => {
  it("answers with the plain 503, and fails fast after the first try", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { lib, mode } = await load(DEAD_PRIMARY, "mysql://root:x@127.0.0.1:1/nowhere_standby_test?connectTimeout=300&acquireTimeout=800");
    mode.setMode("standby");
    const first = await lib.prisma.setting.findFirst().catch((e) => e);
    expect(isAppError(first) && first.code).toBe("DB_UNAVAILABLE");
    const t = Date.now();
    const second = await lib.prisma.setting.findFirst().catch((e) => e);
    expect(isAppError(second) && second.code).toBe("DB_UNAVAILABLE");
    expect(Date.now() - t).toBeLessThan(300);
    mode.resetDbMode();
    fs.rmSync(path.join(process.env.UPLOADS_DIR!, ".db-mode.json"), { force: true });
  });
});

describe("without a standby", () => {
  it("turns an outage into a plain 503 and never switches", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { lib, mode } = await load(DEAD_PRIMARY, "");
    expect(lib.standbyClient()).toBeNull();
    for (let i = 0; i < 3; i++) {
      const err = await lib.prisma.setting.findFirst().catch((e) => e);
      expect(isAppError(err)).toBe(true);
      expect((err as AppError).code).toBe("DB_UNAVAILABLE");
    }
    expect(mode.currentMode()).toBe("primary");
  });

  it("passes ordinary errors through unchanged", async () => {
    const { lib } = await load(saved.db!, "");
    await lib.prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: "a" }, update: {} });
    const err = await lib.prisma.setting.create({ data: { key: KEY, value: "b" } }).catch((e) => e);
    expect(isAppError(err)).toBe(false);
    expect((err as { code?: string }).code).toBe("P2002");
    await lib.prisma.setting.deleteMany({ where: { key: KEY } });
    await lib.prisma.$disconnect();
  });
});

describe("standbyUrl", () => {
  it("turns a TiDB Cloud URL into one the MariaDB driver takes, with TLS", async () => {
    const { standbyUrl } = await import("@/lib/prisma");
    const url = new URL(standbyUrl("mysql://abc.root:secret@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/sshs_standby?ssl-mode=VERIFY_IDENTITY&sslaccept=strict"));
    expect(url.searchParams.get("ssl")).toBe("true");
    expect(url.searchParams.has("ssl-mode")).toBe(false);
    expect(url.searchParams.has("sslaccept")).toBe(false);
    expect(url.searchParams.get("connectionLimit")).toBe("3");
    expect(url.pathname).toBe("/sshs_standby");
  });

  it("leaves a local standby without TLS", async () => {
    const { standbyUrl } = await import("@/lib/prisma");
    expect(new URL(standbyUrl("mysql://root:x@127.0.0.1:3307/sshs_standby_test")).searchParams.has("ssl")).toBe(false);
  });
});
