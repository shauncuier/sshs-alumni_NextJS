import prisma from "@/lib/prisma";
import { generateQrDataUrl } from "@/lib/id-card";
import { openJson, sealJson } from "@/lib/sealed-token";
import type { TicketInfo } from "./types";

// Different purpose from alumni cards, so a card can never be read as a ticket.
const TICKET_PURPOSE = "ssghs-event-ticket-v1";
export const TICKET_QR_PREFIX = "SSGHS-TICKET:";

export function createTicketToken(registrationId: string): string {
  return sealJson(TICKET_PURPOSE, { rid: registrationId });
}

/** Returns the registration id in a scanned ticket, or null for anything that is not a genuine ticket. */
export function readTicketToken(scan: string): string | null {
  const token = scan.trim().startsWith(TICKET_QR_PREFIX) ? scan.trim().slice(TICKET_QR_PREFIX.length) : scan.trim();
  const opened = openJson<{ rid?: unknown }>(TICKET_PURPOSE, token);
  return opened.ok && typeof opened.value.rid === "string" ? opened.value.rid : null;
}

export async function ticketInfo(registrationId: string): Promise<TicketInfo> {
  const qrText = `${TICKET_QR_PREFIX}${createTicketToken(registrationId)}`;
  return { qrText, qrDataUrl: await generateQrDataUrl(qrText) };
}

export type CheckInResult =
  | { ok: true; attendee: { name: string; batch: number | null }; eventTitle: string; packageName: string | null; headCount: number }
  | { ok: false; reason: "INVALID" | "PENDING_PAYMENT" | "CANCELLED" | "ALREADY_CHECKED_IN"; message: string };

/** Checks a scanned ticket in exactly once; refuses anything not CONFIRMED. */
export async function checkInTicket(scan: string, staffEmail: string, now = new Date()): Promise<CheckInResult> {
  const registrationId = readTicketToken(scan);
  if (!registrationId) return { ok: false, reason: "INVALID", message: "This is not a valid event ticket." };

  return prisma.$transaction(async (tx) => {
    const reg = await tx.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true, user: { include: { profile: true } } },
    });
    if (!reg) return { ok: false, reason: "INVALID", message: "This ticket's registration no longer exists." } as const;
    if (reg.status === "PENDING_PAYMENT") return { ok: false, reason: "PENDING_PAYMENT", message: "Payment not confirmed." } as const;
    if (reg.status === "CANCELLED") return { ok: false, reason: "CANCELLED", message: "Registration cancelled." } as const;
    if (reg.status === "CHECKED_IN") {
      const at = reg.checkedInAt?.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
      return { ok: false, reason: "ALREADY_CHECKED_IN", message: `Already checked in at ${at}.` } as const;
    }
    // Conditional update: two simultaneous scans cannot both succeed.
    const { count } = await tx.eventRegistration.updateMany({
      where: { id: reg.id, status: "CONFIRMED" },
      data: { status: "CHECKED_IN", checkedInAt: now, notes: reg.notes ? `${reg.notes}\nChecked in by ${staffEmail}` : `Checked in by ${staffEmail}` },
    });
    if (count === 0) return { ok: false, reason: "ALREADY_CHECKED_IN", message: "Already checked in." } as const;
    return {
      ok: true,
      attendee: { name: reg.user.profile?.fullName ?? reg.user.email, batch: reg.user.profile?.sscBatch ?? null },
      eventTitle: reg.event.title,
      packageName: reg.packageName,
      headCount: reg.headCount,
    } as const;
  });
}
