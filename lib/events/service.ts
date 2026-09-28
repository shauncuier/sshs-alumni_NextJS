import type { Event, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { CLOSED_MESSAGES, registrationClosedReason } from "./availability";
import { formatTaka, isPaidEvent, normalizePackages, parseTaka, type FeeEvent } from "./pricing";
import type { AgendaEntry, PublicEvent } from "./types";

const EVENT_CATEGORIES = ["REUNION", "SPORTS", "WEBINAR", "CULTURAL", "COMMUNITY"] as const;
// Static API segments under /api/events; an event slug must never shadow them.
const RESERVED_SLUGS = new Set(["membership", "verify-ticket"]);

export function eventFeeRules(row: Event): FeeEvent {
  return {
    registrationFee: row.registrationFee,
    extraAdultFee: row.extraAdultFee,
    childFee: row.childFee,
    packages: normalizePackages(row.packages),
  };
}

function normalizeAgenda(raw: unknown): AgendaEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): AgendaEntry[] => {
    if (!item || typeof item !== "object") return [];
    const a = item as Record<string, unknown>;
    return typeof a.time === "string" && typeof a.activity === "string" && a.activity.trim()
      ? [{ time: a.time.trim(), activity: a.activity.trim() }]
      : [];
  });
}

function normalizeHighlights(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s.trim() !== "") : [];
}

export function toPublicEvent(row: Event, heads: { reserved: number; attending: number }, now: Date): PublicEvent {
  const rules = eventFeeRules(row);
  const closedReason = registrationClosedReason({ ...row, ...rules }, heads.reserved, now);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.date.toISOString().slice(0, 10),
    time: row.time ?? "",
    venue: row.venue,
    locationCity: row.locationCity,
    organizer: row.organizer ?? "SSGHS Alumni Association",
    bannerImage: row.bannerImage ?? "/golden-jubilee.jpg",
    maxAttendees: row.maxAttendees,
    attendeesCount: heads.attending,
    placesLeft: Math.max(0, row.maxAttendees - heads.reserved),
    description: row.description,
    isRegistrationOpen: closedReason === null,
    closedReason,
    closedMessage: closedReason ? CLOSED_MESSAGES[closedReason] : null,
    isMegaEvent: row.isMegaEvent,
    isMembershipEvent: row.isMembershipEvent,
    subtitle: row.subtitle ?? undefined,
    guestOfHonor: row.guestOfHonor ?? undefined,
    souvenirDetails: row.souvenirDetails ?? undefined,
    registrationDeadline: row.registrationDeadline?.toISOString(),
    registrationFee: formatTaka(row.registrationFee),
    registrationFeeAmount: row.registrationFee,
    extraAdultFee: row.extraAdultFee,
    childFee: row.childFee,
    paymentInstructions: row.paymentInstructions,
    agenda: normalizeAgenda(row.agenda),
    highlights: normalizeHighlights(row.highlights),
    packages: rules.packages.map((p) => ({
      name: p.name,
      price: formatTaka(p.price),
      priceAmount: p.price,
      description: p.description,
      includes: p.includes,
      isPopular: p.isPopular,
      adults: p.adults,
      children: p.children,
      guestsFree: p.guestsFree,
    })),
  };
}

/** Head counts per event: reserved (pending + confirmed + checked in) and attending (confirmed + checked in). */
export async function headCounts(eventIds: string[]): Promise<Map<string, { reserved: number; attending: number }>> {
  const counts = new Map(eventIds.map((id) => [id, { reserved: 0, attending: 0 }]));
  if (eventIds.length === 0) return counts;
  const rows = await prisma.eventRegistration.groupBy({
    by: ["eventId", "status"],
    where: { eventId: { in: eventIds }, status: { not: "CANCELLED" } },
    _sum: { headCount: true },
  });
  for (const row of rows) {
    const entry = counts.get(row.eventId)!;
    const heads = row._sum.headCount ?? 0;
    entry.reserved += heads;
    if (row.status !== "PENDING_PAYMENT") entry.attending += heads;
  }
  return counts;
}

async function toPublicList(rows: Event[], now: Date): Promise<PublicEvent[]> {
  const counts = await headCounts(rows.map((r) => r.id));
  return rows.map((r) => toPublicEvent(r, counts.get(r.id)!, now));
}

export async function listPublicEvents(now = new Date()): Promise<PublicEvent[]> {
  return toPublicList(await prisma.event.findMany({ orderBy: { date: "asc" } }), now);
}

export async function getPublicEventBySlug(slug: string, now = new Date()): Promise<PublicEvent | null> {
  const row = await prisma.event.findUnique({ where: { slug } });
  return row ? (await toPublicList([row], now))[0] : null;
}

export async function getMembershipEvent(now = new Date()): Promise<PublicEvent | null> {
  const row = await prisma.event.findFirst({ where: { isMembershipEvent: true } });
  return row ? (await toPublicList([row], now))[0] : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function uniqueSlug(db: Prisma.TransactionClient, source: string): Promise<string> {
  const base = slugify(source) || "event";
  let candidate = base;
  for (let n = 2; RESERVED_SLUGS.has(candidate) || (await db.event.findUnique({ where: { slug: candidate }, select: { id: true } })); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function text(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() : undefined;
}
function optionalText(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function amount(v: unknown, label: string): number | undefined {
  if (v === undefined) return undefined;
  const n = parseTaka(v);
  if (Number.isNaN(n)) throw new AppError("INVALID_EVENT", 400, `${label} must be an amount of taka.`);
  return n;
}
function dateValue(v: unknown, label: string): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T09:00:00+06:00` : String(v));
  if (Number.isNaN(d.getTime())) throw new AppError("INVALID_EVENT", 400, `${label} is not a valid date.`);
  return d;
}

/** Validates admin input into Prisma data. Only fields present in `body` are returned. */
function parseEventInput(body: unknown, mode: "create" | "update"): Prisma.EventUncheckedUpdateInput {
  if (!body || typeof body !== "object") throw new AppError("INVALID_EVENT", 400, "Invalid event data.");
  const b = body as Record<string, unknown>;
  const data: Prisma.EventUncheckedUpdateInput = {};

  const title = text(b.title);
  if (title !== undefined) data.title = title;
  if (mode === "create" && !title) throw new AppError("INVALID_EVENT", 400, "The event needs a title.");

  for (const [key, label] of [["description", "Description"], ["venue", "Venue"]] as const) {
    const value = text(b[key]);
    if (value !== undefined) data[key] = value;
    if (mode === "create" && !value) throw new AppError("INVALID_EVENT", 400, `${label} is required.`);
  }

  const date = dateValue(b.date, "The event date");
  if (date) data.date = date;
  if (mode === "create" && !date) throw new AppError("INVALID_EVENT", 400, "The event date is required.");

  if (b.category !== undefined) {
    if (!EVENT_CATEGORIES.includes(b.category as (typeof EVENT_CATEGORIES)[number])) {
      throw new AppError("INVALID_EVENT", 400, "Unknown event category.");
    }
    data.category = b.category as (typeof EVENT_CATEGORIES)[number];
  }

  if (b.maxAttendees !== undefined) {
    const max = Number(b.maxAttendees);
    if (!Number.isInteger(max) || max < 1) throw new AppError("INVALID_EVENT", 400, "Capacity must be a whole number above 0.");
    data.maxAttendees = max;
  }

  const registrationFee = amount(b.registrationFee, "The registration fee");
  if (registrationFee !== undefined) data.registrationFee = registrationFee;
  const extraAdultFee = amount(b.extraAdultFee, "The extra adult fee");
  if (extraAdultFee !== undefined) data.extraAdultFee = extraAdultFee;
  const childFee = amount(b.childFee, "The child fee");
  if (childFee !== undefined) data.childFee = childFee;

  for (const key of ["time", "locationCity", "organizer", "bannerImage", "subtitle", "guestOfHonor", "souvenirDetails", "paymentInstructions"] as const) {
    const value = optionalText(b[key]);
    if (value !== undefined) (data as Record<string, unknown>)[key] = value;
  }
  if (b.registrationDeadline !== undefined) {
    data.registrationDeadline = b.registrationDeadline ? dateValue(b.registrationDeadline, "The registration deadline") : null;
  }
  for (const key of ["isRegistrationOpen", "isMegaEvent", "isMembershipEvent"] as const) {
    if (typeof b[key] === "boolean") data[key] = b[key] as boolean;
  }
  if (b.packages !== undefined) data.packages = normalizePackages(b.packages) as unknown as Prisma.InputJsonValue;
  if (b.agenda !== undefined) data.agenda = normalizeAgenda(b.agenda) as unknown as Prisma.InputJsonValue;
  if (b.highlights !== undefined) data.highlights = normalizeHighlights(b.highlights);
  return data;
}

/** Enforces membership-event rules on the saved row, inside the same transaction. */
async function applyMembershipRules(db: Prisma.TransactionClient, row: Event): Promise<void> {
  if (!row.isMembershipEvent) return;
  if (!isPaidEvent(eventFeeRules(row))) {
    throw new AppError("FREE_MEMBERSHIP_EVENT", 400, "The membership event must have a paid package or registration fee.");
  }
  await db.event.updateMany({ where: { isMembershipEvent: true, id: { not: row.id } }, data: { isMembershipEvent: false } });
}

async function toPublicById(id: string): Promise<PublicEvent> {
  const row = await prisma.event.findUniqueOrThrow({ where: { id } });
  return (await toPublicList([row], new Date()))[0];
}

export async function createEvent(body: unknown): Promise<PublicEvent> {
  const data = parseEventInput(body, "create");
  const id = await prisma.$transaction(async (tx) => {
    const row = await tx.event.create({
      data: { ...(data as Prisma.EventUncheckedCreateInput), slug: await uniqueSlug(tx, String(data.title)) },
    });
    await applyMembershipRules(tx, row);
    return row.id;
  });
  return toPublicById(id);
}

export async function updateEvent(id: string, body: unknown): Promise<PublicEvent> {
  const data = parseEventInput(body, "update");
  await prisma.$transaction(async (tx) => {
    const existing = await tx.event.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
    await applyMembershipRules(tx, await tx.event.update({ where: { id }, data }));
  });
  return toPublicById(id);
}

export async function deleteEvent(id: string): Promise<void> {
  const registrations = await prisma.eventRegistration.count({ where: { eventId: id } });
  if (registrations > 0) {
    throw new AppError("EVENT_HAS_REGISTRATIONS", 409, "This event has registrations. Close registration instead of deleting it.");
  }
  await prisma.event.delete({ where: { id } }).catch(() => {
    throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
  });
}
