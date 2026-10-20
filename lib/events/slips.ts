import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { storedGuests } from "./pricing";
import { ticketInfo } from "./tickets";
import { slipNumber } from "./tokens";

/**
 * Payment slips: the printable record of a confirmed (paid) registration. The member
 * opens theirs at /slip/[id]; admins print one or all from /admin/events/[id]/print.
 */

export interface SlipLine {
  label: string;
  count: number;
  amount: number;
}

export interface PaymentSlipData {
  registrationId: string;
  slipNo: string;
  name: string;
  email: string;
  phone: string | null;
  batch: number | null;
  bloodGroup: string | null;
  eventTitle: string;
  eventDate: string;
  venue: string;
  headCount: number;
  lines: SlipLine[];
  fee: number;
  donation: number;
  total: number;
  paymentMethod: string | null;
  transactionId: string | null;
  paidOn: string;
  confirmedOn: string | null;
  ticketQr: string;
}

const SLIP_INCLUDE = {
  event: { select: { title: true, date: true, venue: true, locationCity: true } },
  user: { select: { email: true, profile: { select: { fullName: true, sscBatch: true, phone: true, bloodGroup: true } } } },
} satisfies Prisma.EventRegistrationInclude;

type SlipReg = Prisma.EventRegistrationGetPayload<{ include: typeof SLIP_INCLUDE }>;

async function toSlip(reg: SlipReg): Promise<PaymentSlipData> {
  const guests = storedGuests(reg);
  const guestTotal = guests.reduce((n, g) => n + g.count * g.price, 0);
  const lines: SlipLine[] = [
    { label: reg.packageName || "Alumnus (member)", count: 1, amount: Math.max(0, reg.totalFee - guestTotal) },
    ...guests.map((g) => ({ label: g.name, count: g.count, amount: g.count * g.price })),
  ];
  const p = reg.user.profile;
  return {
    registrationId: reg.id,
    slipNo: slipNumber(reg.id),
    name: p?.fullName ?? reg.user.email,
    email: reg.user.email,
    phone: p?.phone ?? null,
    batch: p?.sscBatch ?? null,
    bloodGroup: p?.bloodGroup ?? null,
    eventTitle: reg.event.title,
    eventDate: reg.event.date.toISOString(),
    venue: [reg.event.venue, reg.event.locationCity].filter(Boolean).join(", "),
    headCount: reg.headCount,
    lines,
    fee: reg.totalFee,
    donation: reg.donationAmount,
    total: reg.totalFee + reg.donationAmount,
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    paidOn: reg.createdAt.toISOString(),
    confirmedOn: reg.confirmedAt?.toISOString() ?? null,
    ticketQr: (await ticketInfo(reg.id)).qrDataUrl,
  };
}

const PAID = ["CONFIRMED", "CHECKED_IN"] as const;

/**
 * The slip of one registration for `viewer`: their own, or any for an admin. Null when it
 * does not exist, is not theirs, or is not confirmed yet (no slip before the money is checked).
 */
export async function slipFor(registrationId: string, viewer: { id: string; isAdmin: boolean }): Promise<PaymentSlipData | null> {
  const reg = await prisma.eventRegistration.findUnique({ where: { id: registrationId }, include: SLIP_INCLUDE });
  if (!reg || !(PAID as readonly string[]).includes(reg.status)) return null;
  if (reg.userId !== viewer.id && !viewer.isAdmin) return null;
  return toSlip(reg);
}

/** Slips of an event's confirmed registrations (or one, or one batch), by batch then name, for admin printing. */
export async function slipsForEvent(
  eventId: string,
  opts: { registrationId?: string | null; batch?: number | null; source?: string | null } = {}
): Promise<PaymentSlipData[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: { in: [...PAID] },
      ...(opts.registrationId ? { id: opts.registrationId } : {}),
      ...(opts.batch ? { user: { profile: { is: { sscBatch: opts.batch } } } } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    },
    include: SLIP_INCLUDE,
  });
  const slips = await Promise.all(regs.map(toSlip));
  return slips.sort((a, b) => (a.batch ?? 0) - (b.batch ?? 0) || a.name.localeCompare(b.name));
}
