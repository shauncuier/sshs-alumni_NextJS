import type { EventItem } from "@/lib/data";
import type { ClosedReason } from "./availability";

export const PAYMENT_METHODS = ["bKash", "Nagad", "Bank", "Cash"] as const;
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

export interface AgendaEntry {
  time: string;
  activity: string;
}

export interface RsvpInput {
  packageName?: string | null;
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
  paymentInstructions: string | null;
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
  headCount: number;
  totalFee: number;
  donationAmount: number;
  tshirtSize: string | null;
  mealPreference: string | null;
  paymentMethod: string | null;
  transactionId: string | null;
  status: RegistrationStatusValue;
  confirmedBy: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  createdAt: string;
}
