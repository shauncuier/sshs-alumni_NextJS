import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createEvent, deleteEvent, getMembershipEvent, getPublicEventBySlug, listPublicEvents, updateEvent } from "@/lib/events/service";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const jubileeBody = {
  title: "50 Years Golden Jubilee",
  description: "Grand celebration",
  date: "2026-12-30",
  venue: "School Campus",
  category: "REUNION",
  maxAttendees: 5000,
  isMegaEvent: true,
  isMembershipEvent: true,
  extraAdultFee: 500,
  childFee: 300,
  paymentInstructions: "Send to bKash 01XXXXXXXXX",
  packages: [{ name: "General Alumnus Delegate", price: "৳1,000", adults: 1 }],
  agenda: [{ time: "Day 1 - 09:00 AM", activity: "Opening" }],
};

it("creates an event with a unique slug and returns the public shape", async () => {
  const a = await createEvent(jubileeBody);
  const b = await createEvent({ ...jubileeBody, isMembershipEvent: false });
  expect(a.slug).toBe("50-years-golden-jubilee");
  expect(b.slug).not.toBe(a.slug);
  expect(a.packages[0]).toMatchObject({ price: "৳1,000", priceAmount: 1000, adults: 1 });
  expect(a.isRegistrationOpen).toBe(true);
});

it("keeps only one membership event", async () => {
  const first = await createEvent(jubileeBody);
  const second = await createEvent({ ...jubileeBody, title: "Second" });
  expect((await getMembershipEvent())?.id).toBe(second.id);
  expect((await getPublicEventBySlug(first.slug))?.isMembershipEvent).toBe(false);
});

it("refuses a free membership event", async () => {
  await expect(createEvent({ ...jubileeBody, packages: [], registrationFee: 0 })).rejects.toMatchObject({ status: 400 });
});

it("computes live counts and places left from registrations", async () => {
  const event = await makeEvent({ maxAttendees: 10, isRegistrationOpen: true });
  const [a, b] = [await makeMember(), await makeMember()];
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: a.id, headCount: 3, status: "CONFIRMED" } });
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: b.id, headCount: 2, status: "PENDING_PAYMENT" } });
  const pub = await getPublicEventBySlug(event.slug);
  expect(pub).toMatchObject({ attendeesCount: 3, placesLeft: 5 });
});

it("reports why registration is closed", async () => {
  const event = await makeEvent({ registrationFee: 500, paymentInstructions: null });
  expect(await getPublicEventBySlug(event.slug)).toMatchObject({ isRegistrationOpen: false, closedMessage: "Payment details coming soon." });
});

it("does not change a stored registration fee when the price changes", async () => {
  const created = await createEvent(jubileeBody);
  const member = await makeMember();
  await prisma.eventRegistration.create({ data: { eventId: created.id, userId: member.id, totalFee: 1000 } });
  await updateEvent(created.id, { packages: [{ name: "General Alumnus Delegate", price: 2000 }] });
  expect((await prisma.eventRegistration.findFirstOrThrow()).totalFee).toBe(1000);
});

it("refuses to delete an event that has registrations", async () => {
  const event = await makeEvent();
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: (await makeMember()).id } });
  await expect(deleteEvent(event.id)).rejects.toMatchObject({ status: 409 });
});

it("lists events by date", async () => {
  await makeEvent({ title: "Later", date: new Date("2031-01-01") });
  await makeEvent({ title: "Sooner", date: new Date("2030-06-01") });
  expect((await listPublicEvents()).map((e) => e.title)).toEqual(["Sooner", "Later"]);
});

it("keeps the stored registration switch separate from the computed open state", async () => {
  const created = await createEvent({ ...jubileeBody, paymentInstructions: "" });
  expect(created.isRegistrationOpen).toBe(false);
  expect(created.registrationEnabled).toBe(true);

  const updated = await updateEvent(created.id, {
    paymentInstructions: "Send to bKash 01XXXXXXXXX",
    isRegistrationOpen: created.registrationEnabled,
  });
  expect(updated.registrationEnabled).toBe(true);
  expect(updated.isRegistrationOpen).toBe(true);
});
