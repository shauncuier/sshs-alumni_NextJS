import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "./helpers/db";
import { registerForEvent } from "./helpers/register";
import { decideRegistration } from "@/lib/events/admin";
import { decideDonation } from "@/lib/donations";
import { createManualDonation } from "./helpers/donate";
import { syncFromSite } from "@/lib/finance/posting";
import { accountBalances } from "@/lib/finance/reports";

beforeEach(async () => {
  await resetDatabase();
});

const paidEvent = () => makeEvent({ slug: "reunion", title: "Reunion", registrationFee: 1500, paymentInstructions: "bKash 01XXXXXXXXX" });

async function pendingRegistration(trx = "TRXPOST001", donationAmount = 500) {
  const event = await paidEvent();
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug: "reunion", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: trx, donationAmount } });
  return { event, registration };
}

const entries = () => prisma.financeEntry.findMany({ include: { account: true, category: true }, orderBy: { voucherNo: "asc" } });

describe("income from the site", () => {
  it("posts the fee and the donation when the payment is confirmed, into the bKash account", async () => {
    const { event, registration } = await pendingRegistration();
    expect(await prisma.financeEntry.count()).toBe(0);
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    const rows = await entries();
    expect(rows.map((r) => [r.sourceLine, r.amount, r.account.paymentMethod, r.category?.systemKey, r.status, r.eventId])).toEqual([
      ["fee", 150000, "bKash", "registration_fees", "APPROVED", event.id],
      ["donation", 50000, "bKash", "donations", "APPROVED", event.id],
    ]);
    expect(rows[0].reference).toBe("TRXPOST001");
    // Running the catch-up never counts it twice.
    expect(await syncFromSite("admin@example.test")).toEqual({ registrations: 0, donations: 0 });
    expect(await prisma.financeEntry.count()).toBe(2);
  });

  it("voids the income when a confirmed registration is cancelled; a pending cancel posts nothing", async () => {
    const { event, registration } = await pendingRegistration();
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "admin@example.test" });
    await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
    expect((await entries()).every((e) => e.status === "VOID" && e.voidReason?.startsWith("Registration cancelled"))).toBe(true);
    expect((await accountBalances()).reduce((n, a) => n + a.balance, 0)).toBe(0);

    const second = await registerForEvent({ slug: "reunion", sessionUserId: (await makeMember()).id, rsvp: { paymentMethod: "bKash", transactionId: "TRXPOST002" } });
    await decideRegistration({ eventId: event.id, registrationId: second.registration.id, action: "CANCEL", adminEmail: "admin@example.test" });
    expect(await prisma.financeEntry.count({ where: { sourceId: second.registration.id } })).toBe(0);
  });

  it("uses Membership fees for the membership event", async () => {
    const event = await makeEvent({ slug: "join", isMembershipEvent: true, registrationFee: 1000, paymentInstructions: "bKash 01XXXXXXXXX" });
    const member = await makeMember({ status: "PENDING" });
    const reg = await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id, totalFee: 1000, paymentMethod: "Cash", status: "PENDING_PAYMENT" } });
    await decideRegistration({ eventId: event.id, registrationId: reg.id, action: "APPROVE", adminEmail: "admin@example.test" });
    const [row] = await entries();
    expect([row.category?.systemKey, row.account.paymentMethod, row.amount]).toEqual(["membership_fees", "Cash", 100000]);
  });

  it("posts a verified donation once, and back-fills what was confirmed before the accounts existed", async () => {
    const campaign = await prisma.donationCampaign.create({ data: { slug: "lab", title: "Science lab", description: "d", goalAmount: 100000 } });
    const donation = await createManualDonation({ campaignId: campaign.id, amount: 2000, donorName: "Rina", donorPhone: "01711000111", paymentMethod: "Nagad", transactionId: "TRXDON001" }, null);
    await decideDonation({ donationId: donation.id, decision: "VERIFY", adminEmail: "admin@example.test" });
    let rows = await entries();
    expect(rows.map((r) => [r.source, r.amount, r.account.paymentMethod, r.category?.systemKey])).toEqual([["DONATION", 200000, "Nagad", "donations"]]);

    // An older paid registration that never went through the accounts.
    const event = await paidEvent();
    const member = await makeMember();
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id, totalFee: 1500, paymentMethod: "Bank", status: "CONFIRMED", confirmedAt: new Date("2026-03-01") } });
    expect(await syncFromSite("admin@example.test")).toEqual({ registrations: 1, donations: 0 });
    rows = await entries();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.source === "REGISTRATION")?.account.paymentMethod).toBe("Bank");
  });
});
