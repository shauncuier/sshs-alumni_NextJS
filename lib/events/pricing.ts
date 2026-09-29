import { AppError } from "@/lib/app-error";
import type { PackageDef } from "./types";

export const MAX_EXTRA_GUESTS = 10;
const MAX_DONATION = 1_000_000;

/** Reads "৳1,500", "1500" or 1500 as 1500; "Free" as 0. Returns NaN for anything unusable. */
export function parseTaka(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : NaN;
  if (typeof value !== "string") return NaN;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function formatTaka(amount: number): string {
  return amount === 0 ? "Free" : `৳${amount.toLocaleString("en-US")}`;
}

function toCount(value: unknown, fallback: number): number {
  const n = Number(value);
  return value !== undefined && Number.isInteger(n) && n >= 0 && n <= 20 ? n : fallback;
}

/** Cleans admin input or stored JSON into packages; drops entries without a name or price. */
export function normalizePackages(raw: unknown): PackageDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): PackageDef[] => {
    if (!item || typeof item !== "object") return [];
    const p = item as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim() : "";
    const price = parseTaka(p.price);
    if (!name || Number.isNaN(price)) return [];
    return [
      {
        name,
        price,
        description: typeof p.description === "string" ? p.description : "",
        includes: Array.isArray(p.includes) ? p.includes.filter((s): s is string => typeof s === "string") : [],
        isPopular: p.isPopular === true,
        adults: Math.max(1, toCount(p.adults, 1)),
        children: toCount(p.children, 0),
        guestsFree: p.guestsFree === true,
      },
    ];
  });
}

export interface FeeEvent {
  registrationFee: number;
  extraAdultFee: number;
  childFee: number;
  packages: PackageDef[];
}

export interface FeeResult {
  pkg: PackageDef | null;
  extraAdults: number;
  extraChildren: number;
  headCount: number;
  fee: number;
  donation: number;
  total: number;
}

function guestCount(value: number | undefined, label: string): number {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || value < 0 || value > MAX_EXTRA_GUESTS) {
    throw new AppError("INVALID_GUESTS", 400, `The number of ${label} must be between 0 and ${MAX_EXTRA_GUESTS}.`);
  }
  return value;
}

/**
 * The "Jubilee price model": the package price covers its adults and children;
 * extra guests pay the event's per-guest fees unless the package makes them free.
 * The optional donation is added to the total but never to the fee.
 */
export function computeFee(
  event: FeeEvent,
  rsvp: { packageName?: string | null; extraAdults?: number; extraChildren?: number; donationAmount?: number }
): FeeResult {
  const extraAdults = guestCount(rsvp.extraAdults, "extra adults");
  const extraChildren = guestCount(rsvp.extraChildren, "children");

  const donation = rsvp.donationAmount === undefined || rsvp.donationAmount === null ? 0 : Number(rsvp.donationAmount);
  if (!Number.isInteger(donation) || donation < 0 || donation > MAX_DONATION) {
    throw new AppError("INVALID_DONATION", 400, "The donation must be a whole number of taka.");
  }

  let pkg: PackageDef | null = null;
  if (event.packages.length > 0) {
    pkg = event.packages.find((p) => p.name === rsvp.packageName) ?? null;
    if (!pkg) throw new AppError("UNKNOWN_PACKAGE", 400, "Please choose one of the event's packages.");
  }

  const base = pkg ? pkg.price : event.registrationFee;
  const guestFees = pkg?.guestsFree ? 0 : extraAdults * event.extraAdultFee + extraChildren * event.childFee;
  const fee = base + guestFees;
  const headCount = (pkg ? pkg.adults + pkg.children : 1) + extraAdults + extraChildren;
  return { pkg, extraAdults, extraChildren, headCount, fee, donation, total: fee + donation };
}

export function isPaidEvent(event: FeeEvent): boolean {
  return event.registrationFee > 0 || event.packages.some((p) => p.price > 0);
}

/** The YYYY-MM-DD calendar date of an ISO timestamp in Dhaka time (for date inputs). */
export function dhakaDateInput(value: string | undefined | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}
