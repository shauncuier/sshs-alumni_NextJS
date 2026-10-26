import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { guestWho, storedGuests } from "./pricing";
import { slipNumber } from "./tokens";
import type { GuestLine, RegistrationStatusValue } from "./types";

/**
 * Registrations laid out as the paper (offline) registration form, filled in, for the
 * committee's files: /print/event/[id]?what=forms prints one Legal page per
 * registration, so online and paper registrations sit in the same binder.
 * Cancelled registrations are left out.
 */

export interface FilledFormLine {
  label: string;
  /** Names (and children's ages) of the guests on this line. */
  who: string;
  count: number;
  amount: number;
}

export interface FilledRegistrationForm {
  registrationId: string;
  formNo: string;
  status: RegistrationStatusValue;
  /** "online", or "paper" for forms the committee typed in. */
  channel: "online" | "paper";
  registeredOn: string;
  confirmedOn: string | null;
  confirmedBy: string | null;
  eventTitle: string;
  eventDate: string;
  eventDateTentative: boolean;
  venue: string;
  name: string;
  email: string;
  phone: string | null;
  batch: number | null;
  rollNumber: string | null;
  section: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  profession: string | null;
  designation: string | null;
  company: string | null;
  address: string | null;
  photoUrl: string | null;
  packageName: string | null;
  lines: FilledFormLine[];
  headCount: number;
  fee: number;
  donation: number;
  total: number;
  tshirtSize: string | null;
  volunteer: boolean;
  paymentMethod: string | null;
  transactionId: string | null;
  proofType: string | null;
}

const FORM_INCLUDE = {
  event: { select: { title: true, date: true, dateTentative: true, venue: true, locationCity: true } },
  user: {
    select: {
      email: true,
      profile: {
        select: {
          fullName: true,
          sscBatch: true,
          rollNumber: true,
          section: true,
          bloodGroup: true,
          dateOfBirth: true,
          phone: true,
          profession: true,
          designation: true,
          company: true,
          address: true,
          avatarUrl: true,
        },
      },
      verificationRequests: { select: { proofType: true }, orderBy: { createdAt: "desc" as const }, take: 1 },
    },
  },
} satisfies Prisma.EventRegistrationInclude;

type FormReg = Prisma.EventRegistrationGetPayload<{ include: typeof FORM_INCLUDE }>;

function toForm(reg: FormReg, paperSource: string): FilledRegistrationForm {
  const guests: GuestLine[] = storedGuests(reg);
  const guestTotal = guests.reduce((n, g) => n + g.count * g.price, 0);
  const lines: FilledFormLine[] = [
    { label: reg.packageName || "Alumnus (member)", who: "", count: 1, amount: Math.max(0, reg.totalFee - guestTotal) },
    ...guests.map((g) => ({ label: g.name, who: guestWho(g), count: g.count, amount: g.count * g.price })),
  ];
  const p = reg.user.profile;
  return {
    registrationId: reg.id,
    formNo: slipNumber(reg.id),
    status: reg.status as RegistrationStatusValue,
    channel: reg.source === paperSource ? "paper" : "online",
    registeredOn: reg.createdAt.toISOString(),
    confirmedOn: reg.confirmedAt?.toISOString() ?? null,
    confirmedBy: reg.confirmedBy,
    eventTitle: reg.event.title,
    eventDate: reg.event.date.toISOString(),
    eventDateTentative: reg.event.dateTentative,
    venue: [reg.event.venue, reg.event.locationCity].filter(Boolean).join(", "),
    name: p?.fullName ?? reg.user.email,
    email: reg.user.email,
    phone: p?.phone ?? null,
    batch: p?.sscBatch ?? null,
    rollNumber: p?.rollNumber ?? null,
    section: p?.section ?? null,
    bloodGroup: p?.bloodGroup ?? null,
    dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
    profession: p?.profession && p.profession !== "Alumnus" ? p.profession : null,
    designation: p?.designation ?? null,
    company: p?.company ?? null,
    address: p?.address ?? null,
    // The default logo stands in for "no photo"; the form then shows the paste box.
    photoUrl: p?.avatarUrl && p.avatarUrl !== "/logo.png" ? p.avatarUrl : null,
    packageName: reg.packageName,
    lines,
    headCount: reg.headCount,
    fee: reg.totalFee,
    donation: reg.donationAmount,
    total: reg.totalFee + reg.donationAmount,
    tshirtSize: reg.tshirtSize,
    volunteer: /\[Volunteer:/.test(reg.notes ?? ""),
    paymentMethod: reg.paymentMethod,
    transactionId: reg.transactionId,
    proofType: reg.user.verificationRequests[0]?.proofType ?? null,
  };
}

/** Filled forms for an event's registrations (or one, one batch, or the paper ones), by batch then name. */
export async function registrationFormsForEvent(
  eventId: string,
  opts: { registrationId?: string | null; batch?: number | null; source?: string | null; paperSource: string }
): Promise<FilledRegistrationForm[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: { not: "CANCELLED" },
      ...(opts.registrationId ? { id: opts.registrationId } : {}),
      ...(opts.batch ? { user: { profile: { is: { sscBatch: opts.batch } } } } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    },
    include: FORM_INCLUDE,
  });
  return regs.map((r) => toForm(r, opts.paperSource)).sort((a, b) => (a.batch ?? 0) - (b.batch ?? 0) || a.name.localeCompare(b.name));
}
