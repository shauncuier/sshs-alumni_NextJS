import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { registerForEvent } from "@/lib/events/registrations";
import { registrationFormsForEvent } from "@/lib/events/registration-forms";
import { OFFLINE_SOURCE } from "@/lib/events/types";
import { makeEvent, makeMember, resetDatabase } from "../helpers/db";

beforeEach(async () => {
  await resetDatabase();
});

describe("registration forms for printing", () => {
  it("fills the paper form from each registration, pending ones too, cancelled ones left out", async () => {
    const event = await makeEvent({
      slug: "jubilee",
      registrationFee: 1500,
      guestTypes: [
        { name: "Spouse", price: 600, max: 1 },
        { name: "Child (5 years or older)", price: 600, max: 4 },
      ],
      paymentInstructions: "bKash 01XXXXXXXXX",
    });
    const a = await makeMember({ email: "a@example.test" });
    const b = await makeMember({ email: "b@example.test" });
    await prisma.alumniProfile.update({ where: { userId: a.id }, data: { dateOfBirth: new Date("1985-06-15"), bloodGroup: "B+", section: "Science" } });
    const { registration } = await registerForEvent({
      slug: "jubilee",
      sessionUserId: a.id,
      rsvp: {
        guests: { Spouse: 1, "Child (5 years or older)": 1 },
        guestPeople: { Spouse: [{ name: "Rina" }], "Child (5 years or older)": [{ name: "Tuba", age: 7 }] },
        tshirtSize: "XL",
        notes: "[Volunteer: Food]",
        paymentMethod: "bKash",
        transactionId: "TRXFORM001",
      },
    });
    const other = await registerForEvent({ slug: "jubilee", sessionUserId: b.id, rsvp: { paymentMethod: "bKash", transactionId: "TRXFORM002" } });
    await prisma.eventRegistration.update({ where: { id: other.registration.id }, data: { status: "CANCELLED" } });

    const forms = await registrationFormsForEvent(event.id, { paperSource: OFFLINE_SOURCE });
    expect(forms).toHaveLength(1);
    expect(forms[0]).toMatchObject({
      registrationId: registration.id,
      status: "PENDING_PAYMENT",
      channel: "online",
      dateOfBirth: "1985-06-15",
      bloodGroup: "B+",
      tshirtSize: "XL",
      volunteer: true,
      transactionId: "TRXFORM001",
      total: 1500 + 600 + 600,
    });
    expect(forms[0].lines.map((l) => [l.label, l.who, l.amount])).toEqual([
      ["Alumnus (member)", "", 1500],
      ["Spouse", "Rina", 600],
      ["Child (5 years or older)", "Tuba, 7", 600],
    ]);
    expect(await registrationFormsForEvent(event.id, { source: OFFLINE_SOURCE, paperSource: OFFLINE_SOURCE })).toEqual([]);
  });
});
