import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { readTicketToken, TICKET_QR_PREFIX } from "@/lib/events/tickets";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const packages = [
  { name: "General", price: 1000, adults: 1, children: 0 },
  { name: "Patron", price: 5000, adults: 1, children: 0, guestsFree: true },
];
const membershipEvent = () =>
  makeEvent({ slug: "jubilee", isMembershipEvent: true, packages, extraAdultFee: 500, childFee: 300, paymentInstructions: "bKash 01XXXXXXXXX", maxAttendees: 10 });
const account = { fullName: "New Member", email: "new@example.test", password: "Member-Pw-2026", sscBatch: 2001, rollNumber: "12", section: "A" };
const paidRsvp = { packageName: "General", extraAdults: 1, paymentMethod: "bKash", transactionId: " 9ab3xk1 ", donationAmount: 500 };

describe("joining through the membership event", () => {
  it("creates the account, verification request and pending registration together", async () => {
    await membershipEvent();
    const { registration, createdAccount } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: paidRsvp });
    expect(createdAccount).toEqual({ email: "new@example.test" });
    expect(registration).toMatchObject({ status: "PENDING_PAYMENT", headCount: 2, totalFee: 1500, donationAmount: 500, transactionId: "9AB3XK1", ticket: null });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" }, include: { verificationRequests: true } });
    expect(user.status).toBe("PENDING");
    expect(user.verificationRequests).toHaveLength(1);
  });

  it("leaves nothing behind when the registration fails", async () => {
    await membershipEvent();
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, transactionId: "" } })).rejects.toMatchObject({ status: 400 });
    expect(await prisma.user.count()).toBe(0);
  });

  it("never attaches a registration to an existing account", async () => {
    await membershipEvent();
    await makeMember({ email: "new@example.test" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: paidRsvp })).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    expect(await prisma.eventRegistration.count()).toBe(0);
  });

  it("refuses a zero-fee membership registration", async () => {
    await makeEvent({ slug: "jubilee", isMembershipEvent: true, packages: [{ name: "Free", price: 0 }], paymentInstructions: "x" });
    await expect(registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { packageName: "Free" } })).rejects.toMatchObject({ status: 400 });
  });

  it("uses the server price even if the form sends another fee", async () => {
    await membershipEvent();
    const { registration } = await registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, totalFee: 1 } as never });
    expect(registration.totalFee).toBe(1500);
  });

  it("treats transaction IDs case- and space-insensitively", async () => {
    await membershipEvent();
    const member = await makeMember();
    await registerForEvent({ slug: "jubilee", sessionUserId: member.id, rsvp: paidRsvp });
    await expect(
      registerForEvent({ slug: "jubilee", sessionUserId: null, account, rsvp: { ...paidRsvp, transactionId: "9AB3XK1" } })
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_TRANSACTION" });
  });
});

describe("other events", () => {
  it("needs a signed-in, verified member", async () => {
    await makeEvent({ slug: "picnic" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: null, account, rsvp: {} })).rejects.toMatchObject({ status: 401 });
    const pending = await makeMember({ status: "PENDING" });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: pending.id, rsvp: {} })).rejects.toMatchObject({ status: 403 });
  });

  it("confirms free events straight away and gives a ticket", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    const { registration } = await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(registration.status).toBe("CONFIRMED");
    expect(registration.ticket?.qrText.startsWith(TICKET_QR_PREFIX)).toBe(true);
    expect(readTicketToken(registration.ticket!.qrText)).toBe(registration.id);
  });

  it("refuses a second registration and closed events", async () => {
    await makeEvent({ slug: "picnic" });
    await makeEvent({ slug: "closed", isRegistrationOpen: false });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    await expect(registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "ALREADY_REGISTERED" });
    await expect(registerForEvent({ slug: "closed", sessionUserId: member.id, rsvp: {} })).rejects.toMatchObject({ status: 409, code: "REGISTRATION_CLOSED" });
  });

  it("never exceeds capacity, even for simultaneous registrations", async () => {
    await makeEvent({ slug: "small", maxAttendees: 1 });
    const [a, b] = [await makeMember(), await makeMember()];
    const results = await Promise.allSettled([
      registerForEvent({ slug: "small", sessionUserId: a.id, rsvp: {} }),
      registerForEvent({ slug: "small", sessionUserId: b.id, rsvp: {} }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.eventRegistration.count()).toBe(1);
  });

  it("returns the member's own registration", async () => {
    await makeEvent({ slug: "picnic" });
    const member = await makeMember();
    await registerForEvent({ slug: "picnic", sessionUserId: member.id, rsvp: {} });
    expect(await getMemberRegistration("picnic", member.id)).toMatchObject({ eventSlug: "picnic", status: "CONFIRMED" });
    expect(await getMemberRegistration("picnic", (await makeMember()).id)).toBeNull();
  });
});
