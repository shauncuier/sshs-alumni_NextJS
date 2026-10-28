import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";

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

import { decideDonation } from "@/lib/donations";
import { createManualDonation } from "./helpers/donate";
import { makePdf } from "./helpers/images";
import { POST as submitDonation } from "@/app/api/donations/route";
import { PATCH as decideRoute } from "@/app/api/admin/donations/[id]/route";
import { POST as initiateOnline } from "@/app/api/payments/initiate/route";

beforeEach(async () => {
  mail.sent = [];
  session.user = null;
  await resetDatabase();
});

const makeCampaign = (data: { isActive?: boolean } = {}) =>
  prisma.donationCampaign.create({
    data: { slug: `c-${Math.random().toString(36).slice(2, 8)}`, title: "Scholarship Fund", description: "d", goalAmount: 100000, isActive: data.isActive ?? true },
  });
const input = (campaignId: string, extra: Record<string, unknown> = {}) => ({
  campaignId,
  amount: 1500,
  donorName: "Rahim Uddin",
  donorEmail: "rahim@example.test",
  donorPhone: "01711000111",
  donorBatch: 2005,
  paymentMethod: "bKash",
  transactionId: " 9ab3 xk1lq ",
  ...extra,
});
const json = (body: unknown, method = "POST") =>
  new Request("http://x/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const donationForm = (body: unknown, screenshot: Buffer | null = makePdf()) => {
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  if (screenshot) form.append("paymentReceipt", new File([new Uint8Array(screenshot)], "receipt.pdf", { type: "application/pdf" }));
  return new Request("http://x/api", { method: "POST", body: form });
};

describe("manual donations", () => {
  it("records a pending donation that does not count until verified", async () => {
    const campaign = await makeCampaign();
    const donation = await createManualDonation(input(campaign.id), null);
    expect(donation).toMatchObject({ paymentStatus: "PENDING", paymentGateway: "MANUAL", transactionRef: "9AB3XK1LQ", amount: 1500 });
    expect(donation.receiptId).toMatch(/^SSGHS-DON-[0-9A-F]{8}$/);
    expect((await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).raisedAmount).toBe(0);
  });

  it("verifying adds it to the campaign once and emails a receipt", async () => {
    const campaign = await makeCampaign();
    const donation = await createManualDonation(input(campaign.id), null);
    const verified = await decideDonation({ donationId: donation.id, decision: "VERIFY", adminEmail: "admin@example.test" });
    expect(verified.paymentStatus).toBe("COMPLETED");
    await expect(decideDonation({ donationId: donation.id, decision: "VERIFY", adminEmail: "admin@example.test" })).rejects.toMatchObject({ status: 409 });
    const after = await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(after).toMatchObject({ raisedAmount: 1500, donorCount: 1 });
    expect(mail.sent.map((m) => m.to)).toEqual(["rahim@example.test"]);
  });

  it("rejecting needs a reason and never counts", async () => {
    const campaign = await makeCampaign();
    const donation = await createManualDonation(input(campaign.id), null);
    await expect(decideDonation({ donationId: donation.id, decision: "REJECT", adminEmail: "a@x.test" })).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    const rejected = await decideDonation({ donationId: donation.id, decision: "REJECT", reason: "No such bKash transaction", adminEmail: "a@x.test" });
    expect(rejected).toMatchObject({ paymentStatus: "FAILED" });
    expect(rejected.failureReason).toContain("No such bKash transaction");
    expect((await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).raisedAmount).toBe(0);
    expect(mail.sent).toHaveLength(0);
    // A rejected transaction ID may be submitted again (e.g. after a typo was fixed).
    await expect(createManualDonation(input(campaign.id), null)).resolves.toBeTruthy();
  });

  it("refuses bad input, inactive campaigns and reused transaction IDs", async () => {
    const campaign = await makeCampaign();
    const closed = await makeCampaign({ isActive: false });
    const refuse = (extra: Record<string, unknown>, campaignId = campaign.id) => expect(createManualDonation(input(campaignId, extra), null)).rejects.toBeTruthy();
    await refuse({ amount: 5 });
    await refuse({ amount: "abc" });
    await refuse({ donorName: "" });
    await refuse({ donorEmail: "", donorPhone: "" });
    await refuse({ paymentMethod: "PayPal" });
    await refuse({ transactionId: "12" });
    await refuse({}, closed.id);

    await createManualDonation(input(campaign.id), null);
    await expect(createManualDonation(input(campaign.id, { donorName: "Someone Else" }), null)).rejects.toMatchObject({ code: "DUPLICATE_TRANSACTION" });

    // The same payment cannot be claimed for a donation and an event registration.
    const event = await makeEvent({ slug: "dinner" });
    const member = await makeMember();
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id, transactionId: "REGTRX001", status: "PENDING_PAYMENT" } });
    await expect(createManualDonation(input(campaign.id, { transactionId: "regtrx001" }), null)).rejects.toMatchObject({ code: "DUPLICATE_TRANSACTION" });
  });
});

describe("Bangla QR donations", () => {
  const qr = (campaignId: string, extra: Record<string, unknown> = {}) =>
    input(campaignId, { paymentMethod: "Bangla QR", transactionId: "000AT941", payerAccountLast4: "5517", payerPaidAt: new Date().toISOString(), ...extra });

  it("needs a screenshot, the last 4 digits and the time, and stores them", async () => {
    const campaign = await makeCampaign();
    await expect(createManualDonation(qr(campaign.id), null, null)).rejects.toMatchObject({ code: "SCREENSHOT_REQUIRED" });
    await expect(createManualDonation(qr(campaign.id, { payerAccountLast4: "" }), null)).rejects.toMatchObject({ code: "INVALID_ACCOUNT_DIGITS" });
    // The donor's app ID and the time are optional.
    const minimal = await createManualDonation(qr(campaign.id, { transactionId: "", payerPaidAt: undefined }), null);
    expect(minimal).toMatchObject({ transactionRef: null, payerAccountLast4: "5517", payerPaidAt: null });
    await expect(createManualDonation(qr(campaign.id, { payerPaidAt: "soon" }), null)).rejects.toMatchObject({ code: "INVALID_PAYMENT_TIME" });
    // Cash needs no screenshot.
    await expect(createManualDonation(input(campaign.id, { paymentMethod: "Cash", transactionId: "CASH-0001" }), null, null)).resolves.toBeTruthy();
    const donation = await createManualDonation(qr(campaign.id), null);
    expect(donation).toMatchObject({ payerAccountLast4: "5517", merchantTrxId: null });
    expect(donation.paymentScreenshotUrl).toMatch(/^\/api\/media\/receipts\/[a-f0-9]{32}\/receipt\.pdf$/);
  });

  it("is verified only with the TrxID from our SMS, which can confirm one payment only", async () => {
    const campaign = await makeCampaign();
    const first = await createManualDonation(qr(campaign.id), null);
    const second = await createManualDonation(qr(campaign.id, { transactionId: "000AROXA" }), null);
    await expect(decideDonation({ donationId: first.id, decision: "VERIFY", adminEmail: "a@example.test" })).rejects.toMatchObject({ code: "MERCHANT_TRX_REQUIRED" });
    const verified = await decideDonation({ donationId: first.id, decision: "VERIFY", adminEmail: "a@example.test", merchantTrxId: " 72610280154891 " });
    expect(verified).toMatchObject({ paymentStatus: "COMPLETED", merchantTrxId: "72610280154891" });
    await expect(
      decideDonation({ donationId: second.id, decision: "VERIFY", adminEmail: "a@example.test", merchantTrxId: "72610280154891" })
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_MERCHANT_TRX" });
    expect((await prisma.donation.findUniqueOrThrow({ where: { id: second.id } })).paymentStatus).toBe("PENDING");
  });
});

describe("donation routes", () => {
  it("public submit, admin-only decision, both logged", async () => {
    const campaign = await makeCampaign();
    expect((await submitDonation(donationForm(input(campaign.id), null))).status).toBe(400);
    const res = await submitDonation(donationForm(input(campaign.id)));
    expect(res.status).toBe(201);
    const { donation } = await res.json();
    expect(donation).toMatchObject({ status: "PENDING", transactionRef: "9AB3XK1LQ" });

    const ctx = { params: Promise.resolve({ id: donation.id }) };
    expect((await decideRoute(json({ action: "VERIFY" }, "PATCH"), ctx)).status).toBe(403);
    const member = await makeMember();
    session.user = { id: member.id, email: member.email, role: "ALUMNI" };
    expect((await decideRoute(json({ action: "VERIFY" }, "PATCH"), ctx)).status).toBe(403);

    const admin = await makeMember({ role: "ADMIN", email: "boss@example.test" });
    session.user = { id: admin.id, email: admin.email, role: "ADMIN" };
    expect((await decideRoute(json({ action: "VERIFY" }, "PATCH"), ctx)).status).toBe(200);

    const actions = (await prisma.activityLog.findMany({ orderBy: { createdAt: "asc" } })).map((e) => [e.action, e.status]);
    expect(actions).toEqual(expect.arrayContaining([["donation.submitted", "SUCCESS"], ["donation.verified", "SUCCESS"], ["donation.decision_refused", "FAILURE"]]));
  });

  it("online gateway checkout is switched off", async () => {
    const res = await initiateOnline(json({ campaignId: "x", amount: 100 }));
    expect(res.status).toBe(410);
    expect((await res.json()).code).toBe("ONLINE_PAYMENTS_DISABLED");
  });
});
