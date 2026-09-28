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
