import { beforeEach, expect, it } from "vitest";
import { createCardToken } from "@/lib/id-card";
import { registerForEvent } from "@/lib/events/registrations";
import { checkInTicket, ticketInfo, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

async function confirmedTicket() {
  await makeEvent({ slug: "picnic" });
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
  return registration.ticket!.qrText;
}

it("checks a confirmed ticket in once", async () => {
  const qr = await confirmedTicket();
  expect(await checkInTicket(qr, "gate@example.test")).toMatchObject({ ok: true, eventTitle: expect.any(String), headCount: 1 });
  const again = await checkInTicket(qr, "gate@example.test");
  expect(again).toMatchObject({ ok: false, reason: "ALREADY_CHECKED_IN" });
  expect(again.ok ? "" : again.message).toMatch(/Already checked in at/);
});

it("refuses tickets whose payment is not confirmed", async () => {
  await makeEvent({ slug: "paid", registrationFee: 500, paymentInstructions: "bKash 01XXXXXXXXX" });
  const member = await makeMember();
  const { registration } = await registerForEvent({ slug: "paid", sessionUserId: member.id, rsvp: { paymentMethod: "bKash", transactionId: "TRXPAID001" } });
  expect(registration.ticket).toBeNull(); // pending registrations are not shown a ticket
  const { qrText } = await ticketInfo(registration.id); // and one issued anyway is refused at the gate
  expect(await checkInTicket(qrText, "g@x.test")).toMatchObject({ ok: false, reason: "PENDING_PAYMENT", message: "Payment not confirmed." });
});

it("refuses forged tickets and alumni cards", async () => {
  expect(await checkInTicket(`${TICKET_QR_PREFIX}not-a-ticket-at-all-xxxxxxxxxxxxxxxxxxxxxx`, "g@x.test")).toMatchObject({ ok: false, reason: "INVALID" });
  const card = createCardToken({ alumniId: "A", fullName: "B", sscBatch: 2000, membershipTier: "LIFETIME", issuedAt: Date.now() });
  expect(await checkInTicket(card, "g@x.test")).toMatchObject({ ok: false, reason: "INVALID" });
});
