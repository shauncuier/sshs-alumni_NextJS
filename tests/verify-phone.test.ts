import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeMember, resetDatabase } from "./helpers/db";
import { verifiedPhoneToken } from "./helpers/phone";

const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string; status?: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return {
    ...actual,
    getSessionUser: async () => session.user,
    getMemberSession: async () => (session.user ? { user: session.user } : null),
  };
});

import { ensurePhoneReminder, PHONE_REMINDER_TYPE, resetPhoneReminderCache, verifyOwnPhone } from "@/lib/phone-reminder";
import { POST as verifyRoute } from "@/app/api/profile/verify-phone/route";
import { GET as notificationsRoute } from "@/app/api/notifications/route";

beforeEach(async () => {
  session.user = null;
  resetPhoneReminderCache();
  await resetDatabase();
});

const withPhone = async (phone: string | null, verified = false) => {
  const m = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: m.id }, data: { phone, phoneVerifiedAt: verified ? new Date() : null } });
  return m;
};
const reminders = (userId: string) => prisma.notification.findMany({ where: { userId, type: PHONE_REMINDER_TYPE } });
const post = (body: unknown) =>
  verifyRoute(new Request("http://x/api/profile/verify-phone", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

describe("the verify-your-number reminder", () => {
  it("is sent once to a member with an unverified number, and never to others", async () => {
    const me = await withPhone("01711000111");
    const done = await withPhone("01711000222", true);
    const none = await withPhone(null);

    // Two polls at the same moment share one check: one notification.
    const [a, b] = await Promise.all([ensurePhoneReminder(me.id), ensurePhoneReminder(me.id)]);
    expect(a && b).toBe(true);
    expect(await reminders(me.id)).toHaveLength(1);
    resetPhoneReminderCache(); // a restarted server checks again, still one notification
    expect(await ensurePhoneReminder(me.id)).toBe(false);
    const list = await reminders(me.id);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Verify your mobile number", link: "/profile#verify-phone", isRead: false });

    expect(await ensurePhoneReminder(done.id)).toBe(false);
    expect(await ensurePhoneReminder(none.id)).toBe(false);
    expect(await prisma.notification.count({ where: { userId: { in: [done.id, none.id] } } })).toBe(0);
  });

  it("shows up in the member's notifications", async () => {
    const me = await withPhone("01711000111");
    session.user = { id: me.id, email: me.email, role: "ALUMNI", status: "VERIFIED" };
    const res = await notificationsRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0]).toMatchObject({ type: PHONE_REMINDER_TYPE });
  });
});

describe("verifying the number on file", () => {
  it("marks it verified with a code for that number and clears the reminder", async () => {
    const me = await withPhone("+880 1711-000111");
    await ensurePhoneReminder(me.id);
    await expect(verifyOwnPhone(me.id, verifiedPhoneToken("8801711000999"))).rejects.toMatchObject({ status: 400, code: "PHONE_NOT_VERIFIED" });
    await expect(verifyOwnPhone(me.id, "not-a-token")).rejects.toMatchObject({ status: 400 });

    const at = await verifyOwnPhone(me.id, verifiedPhoneToken("8801711000111"));
    expect(at).toBeInstanceOf(Date);
    expect((await prisma.alumniProfile.findUniqueOrThrow({ where: { userId: me.id } })).phoneVerifiedAt).toBeInstanceOf(Date);
    expect((await reminders(me.id))[0].isRead).toBe(true);
  });

  it("works through the route for the signed-in member only", async () => {
    const me = await withPhone("01711000111");
    expect((await post({ phoneVerificationToken: verifiedPhoneToken("8801711000111") })).status).toBe(401);

    session.user = { id: me.id, email: me.email, role: "ALUMNI", status: "VERIFIED" };
    const res = await post({ phoneVerificationToken: verifiedPhoneToken("8801711000111") });
    expect(res.status).toBe(200);
    expect((await res.json()).phoneVerifiedAt).toBeTruthy();
    expect(await prisma.activityLog.count({ where: { action: "profile.phone_verified" } })).toBe(1);
  });

  it("refuses a member with no number on file", async () => {
    const me = await withPhone(null);
    await expect(verifyOwnPhone(me.id, verifiedPhoneToken("8801711000111"))).rejects.toMatchObject({ code: "NO_PHONE" });
  });
});
