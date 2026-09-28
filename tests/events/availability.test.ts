import { expect, it } from "vitest";
import { registrationClosedReason } from "@/lib/events/availability";

const base = {
  isRegistrationOpen: true,
  registrationDeadline: new Date("2030-01-01T00:00:00Z"),
  maxAttendees: 10,
  paymentInstructions: "Send to bKash 01XXXXXXXXX",
  registrationFee: 500,
  extraAdultFee: 0,
  childFee: 0,
  packages: [],
};
const now = new Date("2029-06-01T00:00:00Z");

it("is open when nothing blocks it", () => {
  expect(registrationClosedReason(base, 5, now)).toBeNull();
});
it("reports each closing reason", () => {
  expect(registrationClosedReason({ ...base, isRegistrationOpen: false }, 0, now)).toBe("CLOSED");
  expect(registrationClosedReason(base, 0, new Date("2030-01-02T00:00:00Z"))).toBe("DEADLINE_PASSED");
  expect(registrationClosedReason(base, 10, now)).toBe("FULL");
  expect(registrationClosedReason({ ...base, paymentInstructions: "  " }, 0, now)).toBe("PAYMENT_DETAILS_MISSING");
});
it("does not need payment details for free events", () => {
  expect(registrationClosedReason({ ...base, registrationFee: 0, paymentInstructions: null }, 0, now)).toBeNull();
});
