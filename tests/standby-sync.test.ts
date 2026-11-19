import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prisma, { withSessionCollation } from "@/lib/prisma";
import { runStandbySync } from "@/lib/standby-sync";
import { resetDbMode, setMode } from "@/lib/db-mode";

/** Copies the test database (sshs_test) to the standby test database (sshs_standby_test). */
const standby = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(process.env.TEST_STANDBY_DATABASE_URL!)) });
const PREFIX = "sync-test-";
let dir: string;

const sync = (opts: { full?: boolean } = {}) => runStandbySync({ primary: prisma, standby, dir, ...opts });

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "standby-sync-"));
  await prisma.setting.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await standby.setting.deleteMany({ where: { key: { startsWith: PREFIX } } });
});

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterAll(async () => {
  await prisma.setting.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await standby.setting.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await standby.$disconnect();
  await fs.rm(dir, { recursive: true, force: true });
  resetDbMode();
  process.env.STANDBY_DATABASE_URL = "";
});

describe("standby copy", () => {
  it("copies every table on the first run", async () => {
    await prisma.setting.createMany({ data: [{ key: `${PREFIX}a`, value: "one" }, { key: `${PREFIX}b`, value: "two" }] });
    const r = await sync();
    expect(r.ran).toBe(true);
    expect(r.tables.filter((t) => t.error)).toEqual([]);
    expect(r.tables.length).toBeGreaterThan(30);
    const copied = await standby.setting.findMany({ where: { key: { startsWith: PREFIX } }, orderBy: { key: "asc" } });
    expect(copied.map((s) => s.value)).toEqual(["one", "two"]);
    // Dates arrive unchanged.
    const original = await prisma.setting.findUnique({ where: { key: `${PREFIX}a` } });
    expect(copied[0].updatedAt.toISOString()).toBe(original!.updatedAt.toISOString());
  });

  it("sends nothing when nothing changed", async () => {
    const r = await sync();
    expect(r.written).toBe(0);
    expect(r.deleted).toBe(0);
  });

  it("sends only changed rows and removes deleted ones", async () => {
    await prisma.setting.update({ where: { key: `${PREFIX}a` }, data: { value: "uno" } });
    await prisma.setting.delete({ where: { key: `${PREFIX}b` } });
    const r = await sync();
    expect(r.written).toBe(1);
    expect(r.deleted).toBe(1);
    const copied = await standby.setting.findMany({ where: { key: { startsWith: PREFIX } } });
    expect(copied.map((s) => [s.key, s.value])).toEqual([[`${PREFIX}a`, "uno"]]);
  });

  it("a full run repairs a standby that drifted", async () => {
    await standby.setting.create({ data: { key: `${PREFIX}stray`, value: "not on the main database" } });
    await standby.setting.update({ where: { key: `${PREFIX}a` }, data: { value: "tampered" } });
    const r = await sync({ full: true });
    expect(r.full).toBe(true);
    const copied = await standby.setting.findMany({ where: { key: { startsWith: PREFIX } } });
    expect(copied.map((s) => [s.key, s.value])).toEqual([[`${PREFIX}a`, "uno"]]);
  });

  it("does not run while the site reads the standby", async () => {
    process.env.STANDBY_DATABASE_URL = process.env.TEST_STANDBY_DATABASE_URL;
    vi.spyOn(console, "error").mockImplementation(() => {});
    setMode("standby");
    const r = await sync();
    expect(r.ran).toBe(false);
    expect(r.reason).toMatch(/on the standby/);
    resetDbMode();
    await fs.rm(path.join(process.env.UPLOADS_DIR!, ".db-mode.json"), { force: true });
    process.env.STANDBY_DATABASE_URL = "";
  });

  it("only one process takes a scheduled run", async () => {
    const now = new Date("2026-11-19T10:03:00Z");
    const [a, b] = await Promise.all([
      runStandbySync({ primary: prisma, standby, dir, now, claimSlot: true }),
      runStandbySync({ primary: prisma, standby, dir, now, claimSlot: true }),
    ]);
    expect([a.ran, b.ran].filter(Boolean).length).toBe(1);
  });
});
