import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

it("stores rich event content and registration details", async () => {
  const event = await makeEvent({
    isMembershipEvent: true,
    packages: [{ name: "General", price: 1000, adults: 1, children: 0 }],
    agenda: [{ time: "Day 1 - 09:00 AM", activity: "Opening" }],
    extraAdultFee: 500,
    childFee: 300,
  });
  const member = await makeMember();
  const reg = await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: member.id,
      packageName: "General",
      headCount: 1,
      totalFee: 1000,
      donationAmount: 200,
      paymentMethod: "bKash",
      transactionId: "TRX12345",
      status: "PENDING_PAYMENT",
    },
  });
  expect(reg.status).toBe("PENDING_PAYMENT");
  expect((await prisma.event.findUniqueOrThrow({ where: { id: event.id } })).isMembershipEvent).toBe(true);
});

it("allows one registration per member per event", async () => {
  const event = await makeEvent();
  const member = await makeMember();
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id } });
  await expect(prisma.eventRegistration.create({ data: { eventId: event.id, userId: member.id } })).rejects.toThrow();
});

it("allows a transaction ID only once", async () => {
  const event = await makeEvent();
  const [a, b] = [await makeMember(), await makeMember()];
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: a.id, transactionId: "SAME1" } });
  await expect(
    prisma.eventRegistration.create({ data: { eventId: event.id, userId: b.id, transactionId: "SAME1" } })
  ).rejects.toThrow();
});
