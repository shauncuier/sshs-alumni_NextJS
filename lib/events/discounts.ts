import { Prisma, type Discount, type DiscountKind, type DiscountType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { fieldReader, str } from "@/lib/content-fields";
import { discountOff, formatTaka, type FeeDiscount } from "./pricing";

/**
 * Discounts on event registration fees, managed in /admin/events/discounts.
 *
 * - A COUPON works when the member types its code on the registration form; an
 *   AUTOMATIC discount (e.g. early bird) applies to everyone while it runs.
 * - Either is a percentage or a number of taka, for one event or for every event, and
 *   takes money off the member's own price only (package or batch fee): guests pay in full.
 * - It works from its start date to the end of its end date (Asia/Dhaka) and stops by
 *   itself afterwards. A coupon can also have a maximum number of uses, and each member
 *   can use a coupon once. Cancelled registrations give their use back.
 * - Discounts never add up: a registration gets the biggest one it qualifies for, and
 *   the server checks everything again when the member submits (lib/events/registrations.ts).
 */

type Db = Prisma.TransactionClient | typeof prisma;

const f = fieldReader("INVALID_DISCOUNT");
const COUPON_CODE = /^[A-Z0-9-]{3,40}$/;
const MAX_AMOUNT = 1_000_000;
const NOT_CANCELLED = { not: "CANCELLED" as const };

export type DiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "USED_UP" | "OFF";

export interface DiscountView {
  id: string;
  kind: DiscountKind;
  code: string | null;
  label: string;
  type: DiscountType;
  value: number;
  eventId: string | null;
  eventTitle: string | null;
  /** Asia/Dhaka days, YYYY-MM-DD; null = no limit. */
  startsOn: string | null;
  endsOn: string | null;
  maxUses: number | null;
  isActive: boolean;
  uses: number;
  status: DiscountStatus;
  createdBy: string | null;
  createdAt: string;
}

/** What a member sees: the offer, never the use counts. */
export interface PublicDiscount {
  kind: DiscountKind;
  code: string | null;
  label: string;
  type: DiscountType;
  value: number;
  /** When it stops (ISO), so the form can say "until 15 December". */
  endsAt: string | null;
}

export function normalizeCode(v: unknown): string {
  return str(v).toUpperCase().replace(/\s+/g, "");
}

/** "20% off" or "৳300 off". */
export function describeDiscount(d: { type: DiscountType; value: number }): string {
  return d.type === "PERCENT" ? `${d.value}% off` : `${formatTaka(d.value)} off`;
}

const dhakaDay = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }) : null);

function dayStart(v: unknown, label: string): Date | null {
  const s = str(v);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(`${s}T00:00:00+06:00`).getTime())) throw f.bad(`The ${label} is not a valid date.`);
  return new Date(`${s}T00:00:00+06:00`);
}

function dayEnd(v: unknown, label: string): Date | null {
  const start = dayStart(v, label);
  return start ? new Date(start.getTime() + 24 * 3600_000 - 1) : null;
}

/** Whether the discount runs at `now` (switched on, started, not ended); limits aside. */
export function isRunning(d: Pick<Discount, "isActive" | "startsAt" | "endsAt">, now: Date): boolean {
  return d.isActive && (!d.startsAt || d.startsAt <= now) && (!d.endsAt || d.endsAt >= now);
}

export function discountStatus(d: Pick<Discount, "isActive" | "startsAt" | "endsAt" | "maxUses">, uses: number, now: Date): DiscountStatus {
  if (!d.isActive) return "OFF";
  if (d.endsAt && d.endsAt < now) return "EXPIRED";
  if (d.startsAt && d.startsAt > now) return "SCHEDULED";
  if (d.maxUses !== null && uses >= d.maxUses) return "USED_UP";
  return "ACTIVE";
}

const asFee = (d: Pick<Discount, "type" | "value">): FeeDiscount => ({ type: d.type, value: d.value });

function toPublic(d: Discount): PublicDiscount {
  return { kind: d.kind, code: d.kind === "COUPON" ? d.code : null, label: d.label, type: d.type, value: d.value, endsAt: d.endsAt?.toISOString() ?? null };
}

async function usesOf(db: Db, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db.eventRegistration.groupBy({ by: ["discountId"], where: { discountId: { in: ids }, status: NOT_CANCELLED }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.discountId as string, r._count._all]));
}

// ---------------------------------------------------------------- admin

function parseInput(body: unknown, current: Discount | null) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const kind = (b.kind ?? current?.kind) as DiscountKind;
  if (kind !== "COUPON" && kind !== "AUTOMATIC") throw f.bad("Choose a coupon code or an automatic discount.");
  const type = (b.type ?? current?.type) as DiscountType;
  if (type !== "PERCENT" && type !== "AMOUNT") throw f.bad("Choose a percentage or an amount of taka.");
  const value = type === "PERCENT" ? f.int(b.value, "percentage", 1, 100) : f.int(b.value, "amount of taka", 1, MAX_AMOUNT);
  const code = kind === "COUPON" ? normalizeCode(b.code) : null;
  if (kind === "COUPON" && !COUPON_CODE.test(code ?? "")) {
    throw f.bad("The code must be 3–40 letters, numbers or dashes, e.g. BATCH2013.");
  }
  const label = f.text(b.label, "name members see", 2, 120);
  const eventId = str(b.eventId) || null;
  const startsAt = dayStart(b.startsOn, "start date");
  const endsAt = dayEnd(b.endsOn, "end date");
  if (startsAt && endsAt && endsAt < startsAt) throw f.bad("The end date is before the start date.");
  const maxUses = kind === "COUPON" ? f.optInt(b.maxUses, "maximum number of uses", 1, 100_000) : null;
  const isActive = b.isActive === undefined ? (current?.isActive ?? true) : b.isActive === true;
  return { kind, code, label, type, value, eventId, startsAt, endsAt, maxUses, isActive };
}

async function assertEvent(eventId: string | null) {
  if (eventId && !(await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } }))) {
    throw f.bad("That event no longer exists.");
  }
}

function codeTaken(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function listDiscounts(now = new Date()): Promise<DiscountView[]> {
  const rows = await prisma.discount.findMany({ orderBy: [{ createdAt: "desc" }], include: { event: { select: { title: true } } } });
  const uses = await usesOf(prisma, rows.map((r) => r.id));
  return rows.map((d) => {
    const used = uses.get(d.id) ?? 0;
    return {
      id: d.id,
      kind: d.kind,
      code: d.code,
      label: d.label,
      type: d.type,
      value: d.value,
      eventId: d.eventId,
      eventTitle: d.event?.title ?? null,
      startsOn: dhakaDay(d.startsAt),
      endsOn: dhakaDay(d.endsAt),
      maxUses: d.maxUses,
      isActive: d.isActive,
      uses: used,
      status: discountStatus(d, used, now),
      createdBy: d.createdBy,
      createdAt: d.createdAt.toISOString(),
    };
  });
}

export async function createDiscount(body: unknown, adminEmail: string): Promise<Discount> {
  const data = parseInput(body, null);
  await assertEvent(data.eventId);
  try {
    return await prisma.discount.create({ data: { ...data, createdBy: adminEmail } });
  } catch (err) {
    if (codeTaken(err)) throw new AppError("CODE_TAKEN", 409, `The code ${data.code} is already used by another coupon.`);
    throw err;
  }
}

export async function updateDiscount(id: string, body: unknown): Promise<Discount> {
  const current = await prisma.discount.findUnique({ where: { id } });
  if (!current) throw new AppError("NOT_FOUND", 404, "Discount not found.");
  const data = parseInput({ ...current, startsOn: dhakaDay(current.startsAt), endsOn: dhakaDay(current.endsAt), ...(body as object) }, current);
  await assertEvent(data.eventId);
  try {
    return await prisma.discount.update({ where: { id }, data });
  } catch (err) {
    if (codeTaken(err)) throw new AppError("CODE_TAKEN", 409, `The code ${data.code} is already used by another coupon.`);
    throw err;
  }
}

/** Registrations that used it keep their price and code; only the link is cleared. */
export async function deleteDiscount(id: string): Promise<Discount> {
  const current = await prisma.discount.findUnique({ where: { id } });
  if (!current) throw new AppError("NOT_FOUND", 404, "Discount not found.");
  await prisma.discount.delete({ where: { id } });
  return current;
}

// ---------------------------------------------------------------- members

async function eventIdForSlug(slug: string): Promise<string> {
  const event = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
  return event.id;
}

const forEvent = (eventId: string) => ({ OR: [{ eventId }, { eventId: null }] });

/** The automatic discounts running for an event, and whether any coupon could work. */
export async function eventDiscountOffer(slug: string, now = new Date()): Promise<{ automatic: PublicDiscount[]; couponsAvailable: boolean }> {
  const eventId = await eventIdForSlug(slug);
  const rows = await prisma.discount.findMany({ where: { ...forEvent(eventId), isActive: true } });
  const running = rows.filter((d) => isRunning(d, now));
  const uses = await usesOf(prisma, running.map((d) => d.id));
  const open = running.filter((d) => d.maxUses === null || (uses.get(d.id) ?? 0) < d.maxUses);
  return {
    automatic: open.filter((d) => d.kind === "AUTOMATIC").map(toPublic),
    couponsAvailable: open.some((d) => d.kind === "COUPON"),
  };
}

/** Why a coupon can't be used now, or null when it can. */
async function couponProblem(db: Db, d: Discount, eventId: string, userId: string | null, now: Date): Promise<string | null> {
  if (d.kind !== "COUPON") return "This code doesn't exist.";
  if (d.eventId && d.eventId !== eventId) return "This code is for a different event.";
  if (!d.isActive) return "This code is no longer valid.";
  if (d.startsAt && d.startsAt > now) return `This code works from ${d.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dhaka" })}.`;
  if (d.endsAt && d.endsAt < now) return "This code has expired.";
  if (d.maxUses !== null && ((await usesOf(db, [d.id])).get(d.id) ?? 0) >= d.maxUses) return "This code has been used up.";
  if (userId && (await db.eventRegistration.count({ where: { discountId: d.id, userId, status: NOT_CANCELLED } })) > 0) {
    return "You have already used this code.";
  }
  return null;
}

async function findCoupon(db: Db, code: string): Promise<Discount> {
  const d = COUPON_CODE.test(code) ? await db.discount.findUnique({ where: { code } }) : null;
  if (!d) throw new AppError("INVALID_COUPON", 400, "This code doesn't exist. Check the spelling.");
  return d;
}

/** The form's "Apply" button: the coupon's offer, or a 400 saying why it can't be used. */
export async function checkCoupon(slug: string, rawCode: unknown, userId: string | null, now = new Date()): Promise<PublicDiscount> {
  const eventId = await eventIdForSlug(slug);
  const code = normalizeCode(rawCode);
  if (!code) throw new AppError("INVALID_COUPON", 400, "Type the code first.");
  const d = await findCoupon(prisma, code);
  const problem = await couponProblem(prisma, d, eventId, userId, now);
  if (problem) throw new AppError("INVALID_COUPON", 400, problem);
  return toPublic(d);
}

export interface ChosenDiscount {
  discount: Discount;
  fee: FeeDiscount;
  off: number;
}

/**
 * Inside the registration's transaction: the discount this registration gets, if any.
 * The rows are locked so two members can't take a coupon's last use at the same time.
 * A typed code that can't be used is an error (the member expected the lower price);
 * otherwise the biggest saving wins, a coupon over an automatic one on a tie.
 */
export async function chooseDiscount(
  tx: Prisma.TransactionClient,
  args: { eventId: string; userId: string; code?: string | null; memberPrice: number; now: Date }
): Promise<ChosenDiscount | null> {
  const code = normalizeCode(args.code);
  const coupon = code ? await findCoupon(tx, code) : null;
  const automatic = await tx.discount.findMany({ where: { ...forEvent(args.eventId), kind: "AUTOMATIC", isActive: true } });
  const ids = [...(coupon ? [coupon.id] : []), ...automatic.map((d) => d.id)];
  if (ids.length === 0) return null;
  await tx.$queryRaw`SELECT id FROM \`Discount\` WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;

  const candidates: Discount[] = [];
  if (coupon) {
    const problem = await couponProblem(tx, coupon, args.eventId, args.userId, args.now);
    if (problem) throw new AppError("INVALID_COUPON", 400, problem);
    candidates.push(coupon);
  }
  const uses = await usesOf(tx, automatic.map((d) => d.id));
  for (const d of automatic) {
    if (isRunning(d, args.now) && (d.maxUses === null || (uses.get(d.id) ?? 0) < d.maxUses)) candidates.push(d);
  }
  let best: ChosenDiscount | null = null;
  for (const d of candidates) {
    const off = discountOff(asFee(d), args.memberPrice);
    if (off > 0 && (!best || off > best.off)) best = { discount: d, fee: asFee(d), off };
  }
  return best;
}
