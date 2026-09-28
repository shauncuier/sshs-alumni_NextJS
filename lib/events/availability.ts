import { isPaidEvent, type FeeEvent } from "./pricing";

export type ClosedReason = "CLOSED" | "DEADLINE_PASSED" | "FULL" | "PAYMENT_DETAILS_MISSING";

export const CLOSED_MESSAGES: Record<ClosedReason, string> = {
  CLOSED: "Registration is closed.",
  DEADLINE_PASSED: "The registration deadline has passed.",
  FULL: "This event is full.",
  PAYMENT_DETAILS_MISSING: "Payment details coming soon.",
};

export interface AvailabilityEvent extends FeeEvent {
  isRegistrationOpen: boolean;
  registrationDeadline: Date | null;
  maxAttendees: number;
  paymentInstructions: string | null;
}

/** Why registration is closed right now, or null when it is open. */
export function registrationClosedReason(event: AvailabilityEvent, reservedHeads: number, now: Date): ClosedReason | null {
  if (!event.isRegistrationOpen) return "CLOSED";
  if (event.registrationDeadline && now > event.registrationDeadline) return "DEADLINE_PASSED";
  if (reservedHeads >= event.maxAttendees) return "FULL";
  // Never ask anyone to pay without telling them where.
  if (isPaidEvent(event) && !event.paymentInstructions?.trim()) return "PAYMENT_DETAILS_MISSING";
  return null;
}
