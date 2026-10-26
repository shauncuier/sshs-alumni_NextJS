import { AppError } from "@/lib/app-error";
import type { BatchFeeDef, GuestLine, GuestPerson, GuestTypeDef, PackageDef } from "./types";

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

/** Readable Asia/Dhaka date/time for a stored ISO deadline; empty string when missing or invalid. */
export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
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

/** Cleans admin input or stored JSON into guest types: unique names, a price and a maximum per registration. */
export function normalizeGuestTypes(raw: unknown): GuestTypeDef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((item): GuestTypeDef[] => {
    if (!item || typeof item !== "object") return [];
    const g = item as Record<string, unknown>;
    const name = typeof g.name === "string" ? g.name.trim().slice(0, 60) : "";
    const price = parseTaka(g.price);
    if (!name || Number.isNaN(price) || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    const max = Number(g.max);
    return [{ name, price, max: Number.isInteger(max) && max >= 1 && max <= 20 ? max : MAX_EXTRA_GUESTS }];
  });
}

/** Cleans admin input or stored JSON into batch fee ranges: whole years, from ≤ to, no overlaps, sorted. */
export function normalizeBatchFees(raw: unknown): BatchFeeDef[] {
  if (!Array.isArray(raw)) return [];
  const ranges = raw.flatMap((item): BatchFeeDef[] => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const from = Number(r.fromBatch);
    const to = Number(r.toBatch);
    const price = parseTaka(r.price);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1900 || to > 2200 || Number.isNaN(price)) return [];
    return [{ fromBatch: Math.min(from, to), toBatch: Math.max(from, to), price }];
  });
  ranges.sort((a, b) => a.fromBatch - b.fromBatch);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].fromBatch <= ranges[i - 1].toBatch) {
      throw new AppError(
        "INVALID_BATCH_FEES",
        400,
        `The batch ranges ${ranges[i - 1].fromBatch}–${ranges[i - 1].toBatch} and ${ranges[i].fromBatch}–${ranges[i].toBatch} overlap.`
      );
    }
  }
  return ranges;
}

/** Stored batch fees, never throwing (a bad row in the database must not break the event page). */
export function readBatchFees(raw: unknown): BatchFeeDef[] {
  try {
    return normalizeBatchFees(raw);
  } catch {
    return [];
  }
}

export interface FeeEvent {
  registrationFee: number;
  /** The member's fee by SSC batch; outside every range the registrationFee applies. */
  batchFees?: BatchFeeDef[];
  extraAdultFee: number;
  childFee: number;
  packages: PackageDef[];
  /** Admin-defined guest types (e.g. Spouse, Child). Empty: the older extra-adult / child fees apply. */
  guestTypes?: GuestTypeDef[];
}

const LEGACY_ADULT = "Extra adult";
const LEGACY_CHILD = "Child under 12";

/** The guest types a member can add: the event's own, or the older extra-adult / child pair. */
export function guestTypesOf(event: FeeEvent): GuestTypeDef[] {
  if (event.guestTypes && event.guestTypes.length > 0) return event.guestTypes;
  return [
    { name: LEGACY_ADULT, price: event.extraAdultFee, max: MAX_EXTRA_GUESTS },
    { name: LEGACY_CHILD, price: event.childFee, max: MAX_EXTRA_GUESTS },
  ];
}

/** The member's own fee for an SSC batch (no package): the batch's range, else the main fee. */
export function memberFee(event: FeeEvent, sscBatch?: number | string | null): number {
  const batch = Number(sscBatch);
  const range = Number.isInteger(batch) ? (event.batchFees ?? []).find((r) => batch >= r.fromBatch && batch <= r.toBatch) : undefined;
  return range ? range.price : event.registrationFee;
}

/** Lowest and highest member fee (no package), for "৳1,250–৳1,500" style labels. */
export function memberFeeRange(event: FeeEvent): { min: number; max: number } {
  const prices = [event.registrationFee, ...(event.batchFees ?? []).map((r) => r.price)];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * The member fees to show: one line per batch range ("Batches 1989–2014", 1500), plus
 * "Other batches" when the main fee differs from every range. One "Member" line when
 * the event has no batch ranges.
 */
export function memberFeeLines(event: FeeEvent): { label: string; price: number }[] {
  const ranges = event.batchFees ?? [];
  if (ranges.length === 0) return [{ label: "Member", price: event.registrationFee }];
  const lines = ranges.map((r) => ({ label: r.fromBatch === r.toBatch ? `Batch ${r.fromBatch}` : `Batches ${r.fromBatch}–${r.toBatch}`, price: r.price }));
  if (!ranges.some((r) => r.price === event.registrationFee)) lines.push({ label: "Other batches", price: event.registrationFee });
  return lines;
}

/** "৳1,500" or, with batch ranges, "৳1,250–৳1,500". */
export function memberFeeLabel(event: FeeEvent): string {
  const { min, max } = memberFeeRange(event);
  return min === max ? formatTaka(min) : `${formatTaka(min)}–${formatTaka(max)}`;
}

export interface FeeResult {
  pkg: PackageDef | null;
  extraAdults: number;
  extraChildren: number;
  /** Guests added beyond the member (and the package), with the price each paid. */
  guests: GuestLine[];
  headCount: number;
  fee: number;
  donation: number;
  total: number;
}

function guestCountFor(value: unknown, type: GuestTypeDef): number {
  if (value === undefined || value === null) return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > type.max) {
    throw new AppError("INVALID_GUESTS", 400, `The number of guests for "${type.name}" must be between 0 and ${type.max}.`);
  }
  return n;
}

/**
 * The price model: the package (or the main registration fee) covers the member and the
 * package's own guests; each added guest pays the price of their guest type unless the
 * package makes guests free. The optional donation is added to the total but never to the fee.
 */
export function computeFee(
  event: FeeEvent,
  rsvp: {
    packageName?: string | null;
    /** Guest counts by guest-type name. */
    guests?: Record<string, number> | null;
    /** Older events: counts for the extra-adult / child pair. */
    extraAdults?: number;
    extraChildren?: number;
    donationAmount?: number;
  },
  /** The member's SSC batch: picks their fee from the event's batch ranges. */
  member: { sscBatch?: number | string | null } = {}
): FeeResult {
  const types = guestTypesOf(event);
  const custom = Boolean(event.guestTypes && event.guestTypes.length > 0);
  const requested: Record<string, unknown> =
    rsvp.guests && typeof rsvp.guests === "object"
      ? { ...rsvp.guests }
      : custom
        ? {}
        : { [LEGACY_ADULT]: rsvp.extraAdults, [LEGACY_CHILD]: rsvp.extraChildren };
  for (const name of Object.keys(requested)) {
    if (!types.some((t) => t.name === name)) throw new AppError("INVALID_GUESTS", 400, `"${name}" is not a guest option for this event.`);
  }
  const lines: GuestLine[] = types.map((t) => ({ name: t.name, price: t.price, count: guestCountFor(requested[t.name], t) }));

  const donation = rsvp.donationAmount === undefined || rsvp.donationAmount === null ? 0 : Number(rsvp.donationAmount);
  if (!Number.isInteger(donation) || donation < 0 || donation > MAX_DONATION) {
    throw new AppError("INVALID_DONATION", 400, "The donation must be a whole number of taka.");
  }

  let pkg: PackageDef | null = null;
  if (event.packages.length > 0) {
    pkg = event.packages.find((p) => p.name === rsvp.packageName) ?? null;
    if (!pkg) throw new AppError("UNKNOWN_PACKAGE", 400, "Please choose one of the event's packages.");
  }

  const base = pkg ? pkg.price : memberFee(event, member.sscBatch);
  const guestFees = pkg?.guestsFree ? 0 : lines.reduce((sum, l) => sum + l.count * l.price, 0);
  const fee = base + guestFees;
  const added = lines.reduce((sum, l) => sum + l.count, 0);
  const headCount = (pkg ? pkg.adults + pkg.children : 1) + added;
  return {
    pkg,
    extraAdults: custom ? 0 : lines[0].count,
    extraChildren: custom ? 0 : lines[1].count,
    guests: lines.filter((l) => l.count > 0).map((l) => (pkg?.guestsFree ? { ...l, price: 0 } : l)),
    headCount,
    fee,
    donation,
    total: fee + donation,
  };
}

/** Guest types for children ("Child", "Child under 12", "শিশু"): their guests also give an age. */
export function isChildGuestType(name: string): boolean {
  return /child|kid|শিশু|বাচ্চা|সন্তান/i.test(name);
}

export const MAX_CHILD_GUEST_AGE = 17;

/**
 * Adds each guest's name (and a child's age) to the priced guest lines. Every guest
 * counted needs a name; child guests also need an age from 0 to MAX_CHILD_GUEST_AGE.
 */
export function attachGuestPeople(lines: GuestLine[], raw: unknown): GuestLine[] {
  const given = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return lines.map((line) => {
    const list = Array.isArray(given[line.name]) ? (given[line.name] as unknown[]) : [];
    const child = isChildGuestType(line.name);
    const people: GuestPerson[] = [];
    for (let i = 0; i < line.count; i++) {
      const entry = list[i] && typeof list[i] === "object" ? (list[i] as Record<string, unknown>) : {};
      const name = typeof entry.name === "string" ? entry.name.trim().replace(/\s+/g, " ") : "";
      const which = line.count > 1 ? `${line.name} ${i + 1}` : line.name;
      if (name.length < 2) throw new AppError("GUEST_DETAILS_REQUIRED", 400, `Please write the name of each guest (${which}).`);
      if (name.length > 100) throw new AppError("GUEST_DETAILS_REQUIRED", 400, `The name for ${which} is too long.`);
      if (!child) {
        people.push({ name });
        continue;
      }
      const age = entry.age === "" || entry.age === null || entry.age === undefined ? NaN : Number(entry.age);
      if (!Number.isInteger(age) || age < 0 || age > MAX_CHILD_GUEST_AGE) {
        throw new AppError("GUEST_DETAILS_REQUIRED", 400, `Please give the age of ${name} (${which}), 0 to ${MAX_CHILD_GUEST_AGE}.`);
      }
      people.push({ name, age });
    }
    return { ...line, people };
  });
}

/** "Tuba, 7; Rafi, 4": the guests' names (and children's ages), or "" when none were given. */
export function guestWho(g: Pick<GuestLine, "people">): string {
  return (g.people ?? []).map((p) => (p.age !== undefined && p.age !== null ? `${p.name}, ${p.age}` : p.name)).join("; ");
}

/** "Spouse × 1 (Rina)" or "Child × 2 (Tuba, 7; Rafi, 4)"; older registrations show the count only. */
export function formatGuestLine(g: Pick<GuestLine, "name" | "count" | "people">): string {
  const who = guestWho(g);
  return `${g.name} × ${g.count}${who ? ` (${who})` : ""}`;
}

function storedPeople(raw: unknown): GuestPerson[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const people = raw.flatMap((p): GuestPerson[] => {
    if (!p || typeof p !== "object" || typeof (p as { name?: unknown }).name !== "string") return [];
    const age = Number((p as { age?: unknown }).age);
    return [{ name: (p as { name: string }).name, ...(Number.isInteger(age) ? { age } : {}) }];
  });
  return people.length ? people : undefined;
}

/** Guests stored on a registration; older registrations only have the extra-adult / child counts. */
export function storedGuests(reg: { guests?: unknown; extraAdults: number; extraChildren: number }): GuestLine[] {
  const lines = Array.isArray(reg.guests)
    ? reg.guests.flatMap((item): GuestLine[] => {
        if (!item || typeof item !== "object") return [];
        const g = item as Record<string, unknown>;
        const count = Number(g.count);
        const price = Number(g.price);
        return typeof g.name === "string" && Number.isInteger(count) && count > 0
          ? [{ name: g.name, count, price: Number.isFinite(price) ? price : 0, ...(storedPeople(g.people) ? { people: storedPeople(g.people) } : {}) }]
          : [];
      })
    : [];
  if (lines.length > 0) return lines;
  const legacy: GuestLine[] = [];
  if (reg.extraAdults > 0) legacy.push({ name: LEGACY_ADULT, count: reg.extraAdults, price: 0 });
  if (reg.extraChildren > 0) legacy.push({ name: LEGACY_CHILD, count: reg.extraChildren, price: 0 });
  return legacy;
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
