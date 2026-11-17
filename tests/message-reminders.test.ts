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
const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text?: string; html: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; subject: string; text?: string; html: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});
const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user, getMemberSession: async () => (session.user ? { user: session.user } : null) };
});

import { reminderSms, resetReminderSmsCount, runMessageReminders } from "@/lib/message-reminders";
import { setMessageReminderSetting } from "@/lib/message-reminders-setting";
import { setSmsTestMode } from "@/lib/sms-test-mode";
import { GET as getPrefs, PUT as putPrefs } from "@/app/api/me/notification-preferences/route";

const HOUR = 60 * 60_000;
const T0 = new Date("2026-11-18T06:00:00Z");

beforeEach(async () => {
  sms.sent = [];
  mail.sent = [];
  session.user = null;
  resetReminderSmsCount();
  await resetDatabase();
});

async function member(name: string, phone: string | null, verified: boolean) {
  const m = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { fullName: name, phone, phoneVerifiedAt: verified ? new Date() : null } });
  return m;
}
const message = (from: string, to: string, at: Date, content = "Secret plan for the reunion") =>
  prisma.message.create({ data: { senderId: from, receiverId: to, content, createdAt: at } });

describe("unread message reminders", () => {
  it("waits an hour, then emails and texts a verified number once, without the message text", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await message(a.id, b.id, T0);

    expect(await runMessageReminders(new Date(T0.getTime() + 30 * 60_000))).toMatchObject({ remindedMembers: 0 });
    expect(mail.sent).toHaveLength(0);

    const run = await runMessageReminders(new Date(T0.getTime() + 61 * 60_000));
    expect(run).toEqual({ remindedMembers: 1, emails: 1, sms: 1 });
    expect(mail.sent[0]).toMatchObject({ to: b.email, subject: "You have an unread message on the alumni site" });
    expect(mail.sent[0].text).toContain("Rahim Uddin");
    expect(sms.sent[0]).toMatchObject({ numbers: ["8801711000102"] });
    expect(sms.sent[0].message).toContain("Rahim Uddin");
    for (const text of [mail.sent[0].html, mail.sent[0].text ?? "", sms.sent[0].message]) expect(text).not.toContain("Secret plan");

    const saved = await prisma.message.findFirstOrThrow();
    expect(saved.remindedAt).toBeInstanceOf(Date);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).lastMessageReminderAt).toBeInstanceOf(Date);
    expect(await prisma.activityLog.count({ where: { action: "message.reminder_sent" } })).toBe(1);

    // The same unread message is never reminded twice.
    expect(await runMessageReminders(new Date(T0.getTime() + 8 * HOUR))).toMatchObject({ remindedMembers: 0 });
  });

  it("emails only when the number is not verified, and never reminds about read messages", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", false);
    const c = await member("Nabil Khan", "01711000103", true);
    await message(a.id, b.id, T0);
    await prisma.message.create({ data: { senderId: a.id, receiverId: c.id, content: "x", createdAt: T0, isRead: true } });

    const run = await runMessageReminders(new Date(T0.getTime() + 2 * HOUR));
    expect(run).toEqual({ remindedMembers: 1, emails: 1, sms: 0 });
    expect(mail.sent.map((m) => m.to)).toEqual([b.email]);
  });

  it("leaves out messages older than 2 days (the backlog when reminders start)", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await message(a.id, b.id, new Date(T0.getTime() - 3 * 24 * HOUR));
    expect(await runMessageReminders(T0)).toMatchObject({ remindedMembers: 0 });
    expect(mail.sent).toHaveLength(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).lastMessageReminderAt).toBeNull();
  });

  it("reminds at most every 6 hours", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await message(a.id, b.id, T0);
    await runMessageReminders(new Date(T0.getTime() + 2 * HOUR));
    // A new message: unread for over an hour, but only 3 hours after the last reminder.
    await message(a.id, b.id, new Date(T0.getTime() + 3 * HOUR));
    expect(await runMessageReminders(new Date(T0.getTime() + 5 * HOUR))).toMatchObject({ remindedMembers: 0 });
    // Past the 6 hours: reminded about it.
    expect(await runMessageReminders(new Date(T0.getTime() + 8.5 * HOUR))).toMatchObject({ remindedMembers: 1, emails: 1, sms: 1 });
    expect(mail.sent).toHaveLength(2);
  });

  it("two runs at the same moment remind once", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await message(a.id, b.id, T0);
    await message(a.id, b.id, new Date(T0.getTime() + 60_000));
    const now = new Date(T0.getTime() + 2 * HOUR);
    const [r1, r2] = await Promise.all([runMessageReminders(now), runMessageReminders(now)]);
    expect(r1.remindedMembers + r2.remindedMembers).toBe(1);
    expect(mail.sent).toHaveLength(1);
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].message).toContain("2 unread messages");
  });

  it("follows the member's own switches and the admin switches", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await prisma.user.update({ where: { id: b.id }, data: { messageSmsReminders: false } });
    await message(a.id, b.id, T0);
    expect(await runMessageReminders(new Date(T0.getTime() + 2 * HOUR))).toEqual({ remindedMembers: 1, emails: 1, sms: 0 });

    const c = await member("Nabil Khan", "01711000103", true);
    await setMessageReminderSetting({ email: false, sms: true }, "admin@example.test");
    await message(a.id, c.id, T0);
    expect(await runMessageReminders(new Date(T0.getTime() + 2 * HOUR))).toEqual({ remindedMembers: 1, emails: 0, sms: 1 });

    // Both off: nothing runs at all.
    await setMessageReminderSetting({ email: false, sms: false }, "admin@example.test");
    const d = await member("Sumi Akter", "01711000104", true);
    await message(a.id, d.id, T0);
    expect(await runMessageReminders(new Date(T0.getTime() + 2 * HOUR))).toEqual({ remindedMembers: 0, emails: 0, sms: 0 });
  });

  it("in SMS test mode only logs the text", async () => {
    const a = await member("Rahim Uddin", "01711000101", true);
    const b = await member("Karim Ahmed", "01711000102", true);
    await setSmsTestMode(true, "admin@example.test");
    await message(a.id, b.id, T0);
    expect(await runMessageReminders(new Date(T0.getTime() + 2 * HOUR))).toMatchObject({ remindedMembers: 1, sms: 0 });
    expect(sms.sent).toHaveLength(0);
    expect(await prisma.activityLog.count({ where: { action: "message.reminder_test_mode" } })).toBe(1);
  });
});

describe("the reminder SMS", () => {
  it("fits one plain SMS and leaves out a name it cannot write cheaply", () => {
    const one = reminderSms(1, ["Rahim Uddin"]);
    expect(one).toMatch(/^ExSabujian: You have an unread message from Rahim Uddin\. Read: /);
    const bangla = reminderSms(3, ["রহিম উদ্দিন", "Karim"]);
    expect(bangla).toContain("3 unread messages from a member and 1 other");
    const long = reminderSms(12, ["A".repeat(39), "B", "C"]);
    for (const text of [one, bangla, long]) {
      expect(text.length).toBeLessThanOrEqual(160);
      expect(/^[\x20-\x7E]*$/.test(text)).toBe(true);
    }
  });
});

describe("member preferences", () => {
  const put = (body: unknown) =>
    putPrefs(new Request("http://x/api/me/notification-preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

  it("lets a member turn their own reminders off", async () => {
    expect((await getPrefs()).status).toBe(401);
    const b = await member("Karim Ahmed", "01711000102", false);
    session.user = { id: b.id, email: b.email, role: "ALUMNI" };
    expect(await (await getPrefs()).json()).toEqual({ messageEmailReminders: true, messageSmsReminders: true, hasPhone: true, phoneVerified: false });
    expect((await put({ messageEmailReminders: "no" })).status).toBe(400);
    const res = await put({ messageEmailReminders: false });
    expect(res.status).toBe(200);
    expect((await res.json()).messageEmailReminders).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).messageEmailReminders).toBe(false);
  });
});
