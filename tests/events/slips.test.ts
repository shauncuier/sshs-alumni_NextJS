import { beforeEach, expect, it } from "vitest";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";
import { registerForEvent } from "../helpers/register";
import { decideRegistration } from "@/lib/events/admin";
import { slipFor, slipsForEvent } from "@/lib/events/slips";

beforeEach(resetDatabase);

async function paidRegistration() {
  const event = await makeEvent({
    slug: "jubilee",
    registrationFee: 1500,
    paymentInstructions: "bKash",
    guestTypes: [{ name: "Spouse", price: 600, max: 1 }],
  });
  const member = await makeMember();
  const { registration } = await registerForEvent({
    slug: "jubilee",
    sessionUserId: member.id,
    rsvp: { guests: { Spouse: 1 }, guestPeople: { Spouse: [{ name: "Rina" }] }, paymentMethod: "bKash", transactionId: "TRXSLIP001", donationAmount: 200 },
  });
  return { event, member, registration };
}

it("no slip until the payment is confirmed; then the member and admins get it, nobody else", async () => {
  const { event, member, registration } = await paidRegistration();
  expect(await slipFor(registration.id, { id: member.id, isAdmin: false })).toBeNull();

  await decideRegistration({ eventId: event.id, registrationId: registration.id, action: "APPROVE", adminEmail: "a@x.test" });
  const slip = await slipFor(registration.id, { id: member.id, isAdmin: false });
  expect(slip).toMatchObject({
    headCount: 2,
    fee: 2100,
    donation: 200,
    total: 2300,
    paymentMethod: "bKash",
    transactionId: "TRXSLIP001",
    slipNo: expect.stringMatching(/^SSG-/),
    ticketQr: expect.stringMatching(/^data:image\/png/),
  });
  expect(slip!.lines).toEqual([
    { label: "Alumnus (member)", count: 1, amount: 1500 },
    { label: "Spouse: Rina", count: 1, amount: 600 },
  ]);
  expect(slip!.confirmedOn).not.toBeNull();

  const stranger = await makeMember();
  expect(await slipFor(registration.id, { id: stranger.id, isAdmin: false })).toBeNull();
  expect(await slipFor(registration.id, { id: stranger.id, isAdmin: true })).not.toBeNull();
  expect(await slipsForEvent(event.id)).toHaveLength(1);
  expect(await slipsForEvent(event.id, { batch: 1999 })).toHaveLength(0);
});
