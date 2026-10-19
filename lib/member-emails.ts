import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { storedGuests } from "@/lib/events/pricing";
import {
  membershipApprovedEmail,
  membershipRejectedEmail,
  registrationConfirmedEmail,
  registrationReceivedEmail,
  siteUrl,
  type RegistrationEmailInput,
  type RenderedEmail,
} from "@/lib/email-templates";

/**
 * Emails to members about their registrations and membership. Sent after the
 * change is saved and never throw: a mail problem is logged and must not undo or
 * fail the registration or the committee's decision.
 */

async function deliver(to: string, email: RenderedEmail, what: string): Promise<boolean> {
  try {
    const sent = await sendEmail({ to, ...email });
    if (!sent.success) console.warn(`[member-emails] Could not send the ${what} email (${sent.error ?? "unknown error"}).`);
    return sent.success;
  } catch (err) {
    console.warn(`[member-emails] Could not send the ${what} email (${(err as Error)?.name ?? "error"}).`);
    return false;
  }
}

function dhakaDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
}

/** "received" right after a paid registration; "confirmed" once it is confirmed (or at once for free events). */
export async function emailRegistration(registrationId: string, kind: "received" | "confirmed"): Promise<boolean> {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true, user: { include: { profile: true } } },
    });
    if (!reg) return false;
    const input: RegistrationEmailInput = {
      name: reg.user.profile?.fullName ?? "Alumnus",
      eventTitle: reg.event.title,
      eventDate: `${dhakaDate(reg.event.date)}${reg.event.time ? `, ${reg.event.time}` : ""}`,
      venue: [reg.event.venue, reg.event.locationCity].filter(Boolean).join(", "),
      isMembershipEvent: reg.event.isMembershipEvent,
      headCount: reg.headCount,
      guests: storedGuests(reg),
      totalFee: reg.totalFee,
      donationAmount: reg.donationAmount,
      paymentMethod: reg.paymentMethod,
      transactionId: reg.transactionId,
      slipUrl: kind === "confirmed" && reg.totalFee + reg.donationAmount > 0 ? siteUrl(`/slip/${reg.id}`) : null,
    };
    const email = kind === "received" ? registrationReceivedEmail(input) : registrationConfirmedEmail(input);
    return deliver(reg.user.email, email, `registration ${kind}`);
  } catch (err) {
    console.warn(`[member-emails] Could not prepare the registration email (${(err as Error)?.name ?? "error"}).`);
    return false;
  }
}

export async function emailMembershipDecision(userId: string, decision: "VERIFIED" | "REJECTED"): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) return false;
    const name = user.profile?.fullName ?? "Alumnus";
    const email = decision === "VERIFIED" ? membershipApprovedEmail(name, user.profile?.sscBatch ?? null) : membershipRejectedEmail(name);
    return deliver(user.email, email, decision === "VERIFIED" ? "membership approved" : "membership rejected");
  } catch (err) {
    console.warn(`[member-emails] Could not prepare the membership email (${(err as Error)?.name ?? "error"}).`);
    return false;
  }
}
