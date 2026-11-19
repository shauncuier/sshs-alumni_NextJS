import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";

const sms = vi.hoisted(() => ({ sent: [] as { numbers: string[]; message: string }[] }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[]; message: string }) => {
      sms.sent.push(args);
      return { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});
const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text?: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; subject: string; text?: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

import { alertRecipients, alertSms, checkDatabase, refreshRecipients, runDbWatchdog, type DbStatus } from "@/lib/db-watchdog";
import { setRegistrationAlertEmails } from "@/lib/registration-alerts";
import { GET as health } from "@/app/api/health/route";

let dir: string;
const denied: DbStatus = { ok: false, reason: "permission", detail: "SELECT command denied to user (1142)" };
const T = new Date("2026-11-19T12:36:00Z");
const at = (min: number) => new Date(T.getTime() + min * 60_000);

beforeEach(async () => {
  sms.sent = [];
  mail.sent = [];
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "db-watchdog-"));
  vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.test");
  vi.stubEnv("DB_ALERT_EMAILS", "");
  vi.stubEnv("DB_ALERT_PHONES", "");
  await resetDatabase();
});

describe("database watchdog", () => {
  it("reads a real table and tells permission loss apart", async () => {
    expect(await checkDatabase()).toEqual({ ok: true });
  });

  it("alerts after two failed checks, once an hour across server processes, then says when it is back", async () => {
    fs.writeFileSync(path.join(dir, "recipients.json"), JSON.stringify({ emails: ["committee@example.test"], phones: ["01711000101"] }));
    const processA = { failures: 0 };
    const processB = { failures: 0 };
    const check = async () => denied;

    expect(await runDbWatchdog(processA, { check, dir, now: at(0) })).toBe("failing");
    expect(mail.sent).toHaveLength(0);
    expect(await runDbWatchdog(processA, { check, dir, now: at(3) })).toBe("alerted");
    expect(mail.sent.map((m) => m.to).sort()).toEqual(["boss@example.test", "committee@example.test"]);
    expect(mail.sent[0].text).toContain("Change Permissions");
    expect(sms.sent).toEqual([{ numbers: ["8801711000101"], message: alertSms("permission") }]);

    // Another process, same hour: no second alert.
    await runDbWatchdog(processB, { check, dir, now: at(4) });
    expect(await runDbWatchdog(processB, { check, dir, now: at(7) })).toBe("failing");
    expect(mail.sent).toHaveLength(2);

    // Still down an hour later: one more alert.
    expect(await runDbWatchdog(processA, { check, dir, now: at(65) })).toBe("alerted");
    expect(mail.sent).toHaveLength(4);

    // Back: one "resolved" email, from whichever process sees it first.
    const ok = async (): Promise<DbStatus> => ({ ok: true });
    expect(await runDbWatchdog(processB, { check: ok, dir, now: at(70) })).toBe("recovered");
    expect(await runDbWatchdog(processA, { check: ok, dir, now: at(71) })).toBe("ok");
    expect(mail.sent.filter((m) => m.subject.startsWith("Resolved"))).toHaveLength(2);
    expect(processA.failures).toBe(0);
  });

  it("one failed check alone (a blip) sends nothing", async () => {
    const state = { failures: 0 };
    await runDbWatchdog(state, { check: async () => denied, dir, now: at(0) });
    await runDbWatchdog(state, { check: async () => ({ ok: true }), dir, now: at(3) });
    expect(mail.sent).toHaveLength(0);
    expect(sms.sent).toHaveLength(0);
  });

  it("saves who to tell while the database works, and adds the env lists", async () => {
    const boss = await makeMember({ email: "boss@example.test", role: "SUPER_ADMIN" });
    await prisma.alumniProfile.update({ where: { userId: boss.id }, data: { phone: "01711000555" } });
    await setRegistrationAlertEmails(["alerts@example.test"], "test");
    await refreshRecipients(dir);
    vi.stubEnv("DB_ALERT_EMAILS", "Extra@Example.test");
    vi.stubEnv("DB_ALERT_PHONES", "01811000666, not-a-number");
    const r = await alertRecipients(dir);
    expect(r.emails.sort()).toEqual(["alerts@example.test", "boss@example.test", "extra@example.test"]);
    expect(r.phones.sort()).toEqual(["8801711000555", "8801811000666"]);
  });

  it("a healthy round refreshes the saved recipients", async () => {
    await runDbWatchdog({ failures: 0 }, { dir, now: at(0) });
    expect(fs.existsSync(path.join(dir, "recipients.json"))).toBe(true);
  });

  it("the alert SMS fits one plain text", () => {
    for (const r of ["permission", "down"] as const) {
      expect(alertSms(r).length).toBeLessThanOrEqual(160);
      expect(/^[\x20-\x7E]*$/.test(alertSms(r))).toBe(true);
    }
  });
});

describe("GET /api/health", () => {
  it("answers 200 while the database works", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, mode: "primary", standby: false });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
