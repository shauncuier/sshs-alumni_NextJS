import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { DEFAULT_STANDBY_SYNC_MINUTES, getStandbySyncSetting, setStandbySyncMinutes, standbySyncMinutes } from "@/lib/standby-sync-setting";
import { readLastStandbyRun, runStandbySync } from "@/lib/standby-sync";
import { GET, PUT } from "@/app/api/admin/standby-sync/route";

beforeEach(async () => {
  session.user = null;
  await resetDatabase();
});

const put = (body: unknown) =>
  PUT(new Request("http://localhost:3000/api/admin/standby-sync", { method: "PUT", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body) }));

describe("standby copy interval", () => {
  it("is 5 minutes until an admin changes it, and a damaged value falls back", async () => {
    expect(DEFAULT_STANDBY_SYNC_MINUTES).toBe(5);
    expect((await getStandbySyncSetting()).minutes).toBe(5);
    await prisma.setting.create({ data: { key: "standby-sync", value: "{oops" } });
    expect((await getStandbySyncSetting()).minutes).toBe(5);
    await prisma.setting.update({ where: { key: "standby-sync" }, data: { value: JSON.stringify({ minutes: 7 }) } });
    expect((await getStandbySyncSetting()).minutes).toBe(5);
  });

  it("only takes the offered choices", async () => {
    await expect(setStandbySyncMinutes(1, "x@example.test")).rejects.toThrow();
    await expect(setStandbySyncMinutes(15, "x@example.test")).resolves.toMatchObject({ minutes: 15, updatedBy: "x@example.test" });
    expect(await standbySyncMinutes()).toBe(15);
  });

  it("an admin changes it; the change is logged; the status says the standby is off without a URL", async () => {
    const admin = await makeMember({ role: "ADMIN" });
    session.user = { ...admin, role: "ADMIN" };
    const res = await put({ minutes: 2 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ minutes: 2, updatedBy: admin.email, configured: false, mode: "primary", choices: [2, 5, 10, 15, 30] });
    expect(await prisma.activityLog.count({ where: { action: "standby_sync.updated" } })).toBe(1);
    expect((await put({ minutes: 3 })).status).toBe(400);
    expect((await put({ minutes: "5" })).status).toBe(400);
    expect((await (await GET()).json()).minutes).toBe(2);
  });

  it("only admins may read or change it", async () => {
    const member = await makeMember();
    session.user = { ...member, role: "MODERATOR" };
    expect((await GET()).status).toBe(403);
    expect((await put({ minutes: 10 })).status).toBe(403);
    session.user = null;
    expect([401, 403]).toContain((await GET()).status);
  });
});

describe("scheduled copies", () => {
  it("one run per interval slot, a full copy once a night, and the last run is recorded", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "standby-slots-"));
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
    const { withSessionCollation } = await import("@/lib/prisma");
    const standby = new PrismaClient({ adapter: new PrismaMariaDb(withSessionCollation(process.env.TEST_STANDBY_DATABASE_URL!)) });
    const run = (iso: string, every: number) => runStandbySync({ primary: prisma, standby, dir, now: new Date(iso), claimSlot: true, everyMinutes: every });
    try {
      // 2-minute slots: 10:00 and 10:01 share a slot, 10:02 is a new one.
      expect((await run("2026-11-20T10:00:10Z", 2)).ran).toBe(true);
      expect((await run("2026-11-20T10:01:50Z", 2)).ran).toBe(false);
      expect((await run("2026-11-20T10:02:05Z", 2)).ran).toBe(true);
      // 20:00 UTC (2 am in Bangladesh): the first run of the hour is full, later ones are not.
      expect((await run("2026-11-20T20:00:30Z", 2)).full).toBe(true);
      expect((await run("2026-11-20T20:02:30Z", 2)).full).toBe(false);
      const last = await readLastStandbyRun(dir);
      expect(last).toMatchObject({ at: "2026-11-20T20:02:30.000Z", ran: true, full: false, failed: [] });
    } finally {
      await standby.$disconnect();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
