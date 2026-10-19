import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

const sms = vi.hoisted(() => ({ sent: [] as { numbers: string[]; message: string }[], fail: false }));
vi.mock("@/lib/bulksmsbd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bulksmsbd")>();
  return {
    ...actual,
    sendBulkSms: async (args: { numbers: string[]; message: string }) => {
      sms.sent.push(args);
      return sms.fail
        ? { success: false, isSimulated: false, responseCode: 1007, totalNumbers: 1, validNumbers: [], invalidNumbers: [], error: "Insufficient balance" }
        : { success: true, isSimulated: false, responseCode: 202, totalNumbers: 1, validNumbers: args.numbers, invalidNumbers: [] };
    },
  };
});
const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; text: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; subject: string; text: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});

import { decideRegistration } from "@/lib/events/admin";
import { registerForEvent } from "@/lib/events/registrations";
import { registrationConfirmedSms } from "@/lib/member-sms";
import { setSmsTestMode } from "@/lib/sms-test-mode";

beforeEach(async () => {
  sms.sent = [];
  sms.fail = false;
  mail.sent = [];
  await resetDatabase();
});

async function pending(phone: string | null = "01711000901") {
  const event = await makeEvent({ slug: "jubilee", title: "Golden Jubilee", registrationFee: 1500, paymentInstructions: "bKash" });
  const member = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: member.id }, data: { phone } });
  const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: `TRX${Math.random().toString(36).slice(2, 9)}` } });
  sms.sent = [];
  mail.sent = [];
  const approve = () => decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
  return { registration, approve };
}

describe("confirmation by SMS and email", () => {
  it("one SMS and one email when the committee confirms, with the slip link in the email", async () => {
    const { registration, approve } = await pending();
    await approve();
    expect(sms.sent).toEqual([{ numbers: ["8801711000901"], message: registrationConfirmedSms("Golden Jubilee") }]);
    expect(sms.sent[0].message.length).toBeLessThanOrEqual(160);
    expect(mail.sent.map((m) => m.subject)).toEqual(["You're registered: Golden Jubilee"]);
    expect(mail.sent[0].text).toContain(`/slip/${registration.id}`);
  });

  it("no phone: email only; a failed SMS never undoes the confirmation", async () => {
    const a = await pending(null);
    await a.approve();
    expect(sms.sent).toHaveLength(0);
    expect(mail.sent).toHaveLength(1);

    await resetDatabase();
    const b = await pending();
    sms.fail = true;
    await b.approve();
    expect((await prisma.eventRegistration.findUniqueOrThrow({ where: { id: b.registration.id } })).status).toBe("CONFIRMED");
    expect(await prisma.activityLog.count({ where: { action: "sms.confirmation_failed" } })).toBe(1);
  });

  it("SMS test mode: nothing is texted, the log says what would have been", async () => {
    const { approve } = await pending();
    await setSmsTestMode(true, "admin@x.test");
    await approve();
    expect(sms.sent).toHaveLength(0);
    expect(mail.sent).toHaveLength(1);
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "sms.confirmation_test_mode" } });
    expect(log.summary).toContain("8801711000901");
  });

  it("a free event confirmed at once texts and emails too", async () => {
    await makeEvent({ slug: "picnic", title: "Batch picnic" });
    const member = await makeMember();
    await prisma.alumniProfile.update({ where: { userId: member.id }, data: { phone: "01711000902" } });
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(sms.sent.map((s) => s.numbers[0])).toEqual(["8801711000902"]);
    expect(mail.sent.map((m) => m.subject)).toEqual(["You're registered: Batch picnic"]);
  });
});
