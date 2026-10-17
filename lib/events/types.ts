import type { EventItem } from "@/lib/data";
import type { ProofSummary } from "@/lib/members/proof-types";
import type { ClosedReason } from "./availability";

// "Bangla QR" is Bangladesh Bank's interoperable QR: any bank or MFS app can pay it.
export const PAYMENT_METHODS = ["bKash", "Nagad", "Bangla QR", "Bank", "Cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RegistrationStatusValue = "PENDING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED";

/** A package as stored in Event.packages (price in whole taka). */
export interface PackageDef {
  name: string;
  price: number;
  description: string;
  includes: string[];
  isPopular: boolean;
  /** People covered by the package price, including the member. */
  adults: number;
  children: number;
  /** Extra guests beyond the package are free (e.g. Patron). */
  guestsFree: boolean;
}

/** A kind of guest a member can bring, as stored in Event.guestTypes (price in whole taka). */
export interface GuestTypeDef {
  name: string;
  price: number;
  /** Most of this guest type one registration may add. */
  max: number;
}

/** The member's own fee for a range of SSC batches (e.g. 1989–2014 ৳1,500), as stored in Event.batchFees. */
export interface BatchFeeDef {
  fromBatch: number;
  toBatch: number;
  price: number;
}

/** Guests on one registration, with the price each paid then. */
export interface GuestLine {
  name: string;
  count: number;
  price: number;
}

export interface AgendaEntry {
  time: string;
  activity: string;
}

export interface RsvpInput {
  packageName?: string | null;
  /** Guest counts by guest-type name. */
  guests?: Record<string, number> | null;
  /** Where the member came from (an ad's utm_source/utm_campaign); cleaned on the server. */
  source?: string | null;
  extraAdults?: number;
  extraChildren?: number;
  tshirtSize?: string | null;
  mealPreference?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  donationAmount?: number;
  notes?: string | null;
}

export interface AccountInput {
  fullName: string;
  email: string;
  phone?: string | null;
  /** From POST /api/auth/phone-otp/verify; proves the member received an SMS code on `phone`. */
  phoneVerificationToken?: string | null;
  /** From POST /api/auth/email-otp/verify; the fallback when the SMS code fails. Proves the member owns `email`. */
  emailVerificationToken?: string | null;
  password: string;
  sscBatch: number | string;
  rollNumber?: string | null;
  section?: string | null;
  profession?: string | null;
  company?: string | null;
  locationCity?: string | null;
  /** Set by the server after the profile photo is saved; never read from the request. */
  avatarUrl?: string | null;
  avatarOriginalUrl?: string | null;
  /** Set by the server after the proof-of-study document is saved; never read from the request. */
  proofType?: string | null;
  proofNote?: string | null;
  proofFileUrl?: string | null;
  proofMime?: string | null;
}

/** Proof of study sent with a signed-out join: `payload.proof` plus the `proof` file. */
export interface ProofInput {
  type?: unknown;
  note?: unknown;
  file?: Buffer;
}

/** Package as sent to pages: display price plus the numbers the form needs. */
export interface PublicPackage {
  name: string;
  price: string;
  priceAmount: number;
  description: string;
  includes: string[];
  isPopular?: boolean;
  adults: number;
  children: number;
  guestsFree: boolean;
}

/** Event as returned by the public APIs; a superset of the EventItem pages already use. */
export type PublicEvent = Omit<EventItem, "packages"> & {
  slug: string;
  packages: PublicPackage[];
  placesLeft: number;
  closedReason: ClosedReason | null;
  closedMessage: string | null;
  /** The admin's stored on/off switch (isRegistrationOpen is computed and also reflects deadline, capacity, payment details). */
  registrationEnabled: boolean;
  isMembershipEvent: boolean;
  registrationFeeAmount: number;
  extraAdultFee: number;
  childFee: number;
  /** What a member can add: the event's guest types, or the older extra-adult / child pair. */
  guestTypes: GuestTypeDef[];
  /** True when the admin defined the guest types (false: the older pair). */
  customGuestTypes: boolean;
  /** The member's fee by SSC batch; batches outside every range pay registrationFeeAmount. */
  batchFees: BatchFeeDef[];
  /** Extra payment instructions for this event only; the association's own come from paymentMethods. */
  paymentInstructions: string | null;
  /** Methods members can pay with (Admin → Payment settings). */
  paymentMethods: string[];
};

export interface TicketInfo {
  /** Text encoded in the QR code: "SSGHS-TICKET:<token>". */
  qrText: string;
  qrDataUrl: string;
}

export interface MemberRegistration {
  id: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  status: RegistrationStatusValue;
  isMembershipEvent: boolean;
  packageName: string | null;
  guests: GuestLine[];
  headCount: number;
  totalFee: number;
  donationAmount: number;
  paymentMethod: string | null;
  transactionId: string | null;
  createdAt: string;
  ticket: TicketInfo | null;
}

export interface AdminRegistration {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  batch: number | null;
  rollNumber: string | null;
  section: string | null;
  avatarUrl: string | null;
  membershipStatus: "PENDING" | "VERIFIED" | "REJECTED";
  packageName: string | null;
  extraAdults: number;
  extraChildren: number;
  guests: GuestLine[];
  /** Where the member came from, e.g. "facebook/jubilee2026". */
  source: string | null;
  headCount: number;
  totalFee: number;
  donationAmount: number;
  tshirtSize: string | null;
  mealPreference: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  notes: string | null;
  status: RegistrationStatusValue;
  confirmedBy: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
  /** The member's proof of study (latest verification request), if they uploaded one when joining. */
  proof: ProofSummary | null;
}
