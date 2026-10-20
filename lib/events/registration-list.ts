import prisma from "@/lib/prisma";
import { isPlaceholderEmail } from "./offline-entry";
import { slipNumber } from "./tokens";

/** One row of the printed registration list (the committee's register of entries). */
export interface RegistrationListRow {
  registrationId: string;
  slipNo: string;
  name: string;
  batch: number | null;
  phone: string;
  /** null when the member gave no email (paper form). */
  email: string | null;
  formNo: string | null;
  receiptNo: string | null;
  headCount: number;
  totalFee: number;
  donation: number;
  paymentMethod: string | null;
  transactionId: string | null;
  status: string;
  /** Who entered (paper form) or confirmed it. */
  enteredBy: string | null;
  /** ISO time it was registered. */
  createdAt: string;
}

const OFFLINE_NOTE = /\[Offline form(?: no\. ([^,\]]+))?(?:, receipt no\. ([^,\]]+))?, entered by ([^\]]+)\]/;

/** Form no., receipt no. and the committee member, from the note lib/events/offline-entry.ts writes. */
export function readOfflineNote(notes: string | null | undefined): { formNo: string | null; receiptNo: string | null; enteredBy: string | null } {
  const m = notes ? OFFLINE_NOTE.exec(notes) : null;
  return { formNo: m?.[1]?.trim() || null, receiptNo: m?.[2]?.trim() || null, enteredBy: m?.[3]?.trim() || null };
}

/** Confirmed registrations of an event in the order they were entered, optionally one batch or one source. */
export async function registrationListForPrint(
  eventId: string,
  opts: { batch?: number | null; source?: string | null } = {}
): Promise<RegistrationListRow[]> {
  const regs = await prisma.eventRegistration.findMany({
    where: {
      eventId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      ...(opts.batch ? { user: { profile: { is: { sscBatch: opts.batch } } } } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      headCount: true,
      totalFee: true,
      donationAmount: true,
      paymentMethod: true,
      transactionId: true,
      status: true,
      notes: true,
      confirmedBy: true,
      createdAt: true,
      user: { select: { email: true, profile: { select: { fullName: true, sscBatch: true, phone: true } } } },
    },
  });
  return regs.map((r) => {
    const note = readOfflineNote(r.notes);
    return {
      registrationId: r.id,
      slipNo: slipNumber(r.id),
      name: r.user.profile?.fullName ?? r.user.email,
      batch: r.user.profile?.sscBatch ?? null,
      phone: r.user.profile?.phone ?? "",
      email: isPlaceholderEmail(r.user.email) ? null : r.user.email,
      formNo: note.formNo,
      receiptNo: note.receiptNo,
      headCount: r.headCount,
      totalFee: r.totalFee,
      donation: r.donationAmount,
      paymentMethod: r.paymentMethod,
      transactionId: r.transactionId,
      status: r.status,
      enteredBy: note.enteredBy ?? r.confirmedBy,
      createdAt: r.createdAt.toISOString(),
    };
  });
}
