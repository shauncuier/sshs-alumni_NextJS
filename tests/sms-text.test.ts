import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

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
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return { ...actual, sendEmail: async () => ({ success: true, messageId: "m1" }) };
});
const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { decideRegistration } from "@/lib/events/admin";
import { registerForEvent } from "./helpers/register";
import { registrationConfirmedSms } from "@/lib/member-sms";
import { getRegistrationSmsText, setRegistrationSmsText } from "@/lib/sms-text";
import { setRegistrationAlertEmails } from "@/lib/registration-alerts";
import { GET, PUT } from "@/app/api/admin/sms-text/route";

beforeEach(async () => {
  sms.sent = [];
  session.user = null;
  await resetDatabase();
  await setRegistrationAlertEmails([], "test");
});

async function confirmOne(title = "Golden Jubilee") {
  const event = await makeEvent({ slug: "jubilee", title, registrationFee: 1500, paymentInstructions: "bKash" });
  const member = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: member.id }, data: { phone: "01711000901" } });
  const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: `TRX${Math.random().toString(36).slice(2, 9)}` } });
  sms.sent = [];
  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
  return sms.sent.map((s) => s.message);
}

describe("registration confirmed SMS text", () => {
  it("default text is English, one SMS, with the event and the dashboard link", async () => {
    const text = registrationConfirmedSms("Golden Jubilee");
    expect(text).toMatch(/^Dear ExSabujian, your Golden Jubilee registration is confirmed\. Ticket & payment slip: https?:\/\/\S+\/dashboard$/);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(registrationConfirmedSms("Iftar party")).toContain("your event registration");
    expect(await confirmOne()).toEqual([text]);
  });

  it("the admin's text is used for the next confirmation; reset goes back to the default", async () => {
    await setRegistrationSmsText("  Hello {event}   member,\nsee {link}  ", "admin@x.test");
    expect((await getRegistrationSmsText()).text).toBe("Hello {event} member, see {link}");
    const [message] = await confirmOne();
    expect(message).toMatch(/^Hello Golden Jubilee member, see https?:\/\/\S+\/dashboard$/);

    expect(await setRegistrationSmsText(null, "admin@x.test")).toMatchObject({ isDefault: true, text: expect.stringMatching(/^Dear ExSabujian/) });
    expect(await prisma.setting.count({ where: { key: "sms-text-registration-confirmed" } })).toBe(0);
  });

  it("only payment admins change it, too long is refused, and every change is logged", async () => {
    const put = (body: unknown) =>
      PUT(new Request("http://x/api/admin/sms-text", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await put({ text: "Hi {link}" })).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await put({ text: "x".repeat(321) })).status).toBe(400);
    expect((await put({ text: 5 })).status).toBe(400);
    const res = await put({ text: "Hi {event}, ticket: {link}" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ text: "Hi {event}, ticket: {link}", isDefault: false, updatedBy: admin.email });
    expect(await (await GET()).json()).toMatchObject({ text: "Hi {event}, ticket: {link}", defaultText: expect.stringMatching(/^Dear ExSabujian/) });
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "sms_text.updated" } });
    expect(log.summary).toBe('Registration confirmation SMS changed to: "Hi {event}, ticket: {link}"');
  });
});
