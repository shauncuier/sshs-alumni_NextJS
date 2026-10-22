import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { siteUrl } from "@/lib/email-templates";
import { paymentNoticesOn } from "@/lib/payment-notices";
import { smsTestModeOn } from "@/lib/sms-test-mode";

/**
 * Text messages to members when the committee confirms their payment (a registration
 * or a donation), alongside the emails in lib/member-emails.ts. Sent after the change
 * is saved and never throw: an SMS problem is logged and must not undo the committee's
 * decision. Nothing is sent while the admin has turned these texts off (Admin → Payments)
 * or while SMS test mode is on (Admin → Bulk SMS); the activity log says why.
 */

/** "Your registration is confirmed" with the dashboard link, in English so it fits one SMS (160 characters). */
export function registrationConfirmedSms(eventTitle: string): string {
  const what = /jubilee/i.test(eventTitle) ? "Golden Jubilee registration" : "event registration";
  return `Praktan Sabujian Parishad: your ${what} is confirmed. Ticket & payment slip: ${siteUrl("/dashboard")}`;
}

/** "We received your donation", with the receipt number, in one SMS. */
export function donationReceivedSms(amount: number, receiptId: string): string {
  return `Praktan Sabujian Parishad: we received your donation of Tk ${Math.round(amount).toLocaleString("en-US")}. Thank you! Receipt ${receiptId}`;
}

export type SmsOutcome = "sent" | "off" | "test-mode" | "no-phone" | "failed";

type LogBase = { category: "SMS"; targetType: string; targetId: string; actor?: { id?: string; email: string } };

async function textMember(rawPhone: string | null | undefined, message: string, base: LogBase, who: string): Promise<SmsOutcome> {
  if (!(await paymentNoticesOn()).sms) {
    await logActivity({ ...base, action: "sms.confirmation_off", summary: `Confirmation SMS to ${who} not sent: turned off in Admin → Payments` });
    return "off";
  }
  const number = normalizeBdPhoneNumber(rawPhone ?? "");
  if (!number || !isValidBdMobile(number)) {
    await logActivity({ ...base, action: "sms.confirmation_skipped", summary: `No mobile number for ${who}: no confirmation SMS` });
    return "no-phone";
  }
  if (await smsTestModeOn()) {
    await logActivity({ ...base, action: "sms.confirmation_test_mode", summary: `Test mode: would text ${number}: "${message}"` });
    return "test-mode";
  }
  const sent = await sendBulkSms({ numbers: [number], message });
  if (!sent.success) {
    await logActivity({ ...base, action: "sms.confirmation_failed", status: "FAILURE", summary: `Confirmation SMS to ${number} failed: ${sent.error ?? "gateway error"}` });
    return "failed";
  }
  await logActivity({ ...base, action: "sms.confirmation_sent", summary: `Confirmation SMS sent to ${number}` });
  return "sent";
}

export async function smsRegistrationConfirmed(registrationId: string): Promise<SmsOutcome> {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, userId: true, event: { select: { title: true } }, user: { select: { email: true, profile: { select: { phone: true } } } } },
    });
    if (!reg) return "failed";
    const base: LogBase = { category: "SMS", targetType: "EventRegistration", targetId: reg.id, actor: { id: reg.userId, email: reg.user.email } };
    return await textMember(reg.user.profile?.phone, registrationConfirmedSms(reg.event.title), base, reg.user.email);
  } catch (err) {
    console.warn(`[member-sms] Could not send the confirmation SMS (${(err as Error)?.name ?? "error"}).`);
    return "failed";
  }
}

export async function smsDonationReceived(donationId: string): Promise<SmsOutcome> {
  try {
    const d = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { id: true, amount: true, receiptId: true, donorName: true, donorPhone: true, donorEmail: true, userId: true },
    });
    if (!d) return "failed";
    const base: LogBase = { category: "SMS", targetType: "Donation", targetId: d.id, ...(d.donorEmail ? { actor: { id: d.userId ?? undefined, email: d.donorEmail } } : {}) };
    return await textMember(d.donorPhone, donationReceivedSms(d.amount, d.receiptId ?? d.id), base, d.donorName || d.donorEmail || "the donor");
  } catch (err) {
    console.warn(`[member-sms] Could not send the donation SMS (${(err as Error)?.name ?? "error"}).`);
    return "failed";
  }
}
