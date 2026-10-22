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
const mail = vi.hoisted(() => ({ sent: [] as { to: string; subject: string }[] }));
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    sendEmail: async (payload: { to: string; subject: string }) => {
      mail.sent.push(payload);
      return { success: true, messageId: "m1" };
    },
  };
});
const session = vi.hoisted(() => ({ user: null as { id: string; email: string; role: string } | null }));
vi.mock("@/lib/session-user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-user")>();
  return { ...actual, getSessionUser: async () => session.user };
});

import { decideRegistration } from "@/lib/events/admin";
import { registerForEvent } from "@/lib/events/registrations";
import { createManualDonation, decideDonation } from "@/lib/donations";
import { donationReceivedSms } from "@/lib/member-sms";
import { getPaymentNotices, setPaymentNotices } from "@/lib/payment-notices";
import { GET, PUT } from "@/app/api/admin/payment-notices/route";

beforeEach(async () => {
  sms.sent = [];
  mail.sent = [];
  session.user = null;
  await resetDatabase();
});

async function pendingRegistration() {
  const event = await makeEvent({ slug: "jubilee", title: "Golden Jubilee", registrationFee: 1500, paymentInstructions: "bKash" });
  const member = await makeMember();
  await prisma.alumniProfile.update({ where: { userId: member.id }, data: { phone: "01711000901" } });
  const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRXPN0001" } });
  sms.sent = [];
  mail.sent = [];
  return () => decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
}

async function pendingDonation() {
  const campaign = await prisma.donationCampaign.create({ data: { slug: "fund", title: "Scholarship Fund", description: "d", goalAmount: 100000 } });
  const donation = await createManualDonation(
    { campaignId: campaign.id, amount: 1500, donorName: "Rahim Uddin", donorEmail: "rahim@example.test", donorPhone: "01711000111", paymentMethod: "bKash", transactionId: "TRXDN0001" },
    null
  );
  return () => decideDonation({ donationId: donation.id, decision: "VERIFY", adminEmail: "a@x.test" });
}

describe("payment confirmation messages", () => {
  it("both are on until an admin turns one off", async () => {
    expect(await getPaymentNotices()).toMatchObject({ sms: true, email: true, updatedBy: null });
  });

  it("a verified donation is texted and emailed to the donor", async () => {
    const verify = await pendingDonation();
    const donation = await verify();
    expect(sms.sent).toEqual([{ numbers: ["8801711000111"], message: donationReceivedSms(1500, donation.receiptId ?? donation.id) }]);
    expect(sms.sent[0].message.length).toBeLessThanOrEqual(160);
    expect(mail.sent.map((m) => m.to)).toEqual(["rahim@example.test"]);
  });

  it("SMS off: only the email goes out, and the log says why", async () => {
    await setPaymentNotices({ sms: false, email: true }, "admin@x.test");
    await (await pendingRegistration())();
    await (await pendingDonation())();
    expect(sms.sent).toHaveLength(0);
    expect(mail.sent).toHaveLength(2);
    expect(await prisma.activityLog.count({ where: { action: "sms.confirmation_off" } })).toBe(2);
  });

  it("email off: only the SMS goes out, and the confirmation still stands", async () => {
    await setPaymentNotices({ sms: true, email: false }, "admin@x.test");
    await (await pendingRegistration())();
    await (await pendingDonation())();
    expect(mail.sent).toHaveLength(0);
    expect(sms.sent).toHaveLength(2);
    expect(await prisma.eventRegistration.count({ where: { status: "CONFIRMED" } })).toBe(1);
    expect(await prisma.donation.count({ where: { paymentStatus: "COMPLETED" } })).toBe(1);
  });

  it("only payment admins switch them, and every change is logged", async () => {
    const put = (body: unknown) =>
      PUT(new Request("http://x/api/admin/payment-notices", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    const mod = await makeMember({ role: "MODERATOR" });
    session.user = { id: mod.id, email: mod.email, role: "MODERATOR" };
    expect((await put({ sms: false, email: true })).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await put({ sms: "no", email: true })).status).toBe(400);
    const res = await put({ sms: false, email: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sms: false, email: true, updatedBy: admin.email });
    expect(await (await GET()).json()).toMatchObject({ sms: false, email: true });
    const log = await prisma.activityLog.findFirstOrThrow({ where: { action: "payment_notices.updated" } });
    expect(log.summary).toBe("Payment confirmation SMS off, email on");
  });
});
