import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { siteUrl } from "@/lib/email-templates";
import { smsTestModeOn } from "@/lib/sms-test-mode";

/**
 * Text messages to members about their registrations, alongside the emails in
 * lib/member-emails.ts. Sent after the change is saved and never throw: an SMS problem
 * is logged and must not undo the committee's decision. While SMS test mode is on
 * (Admin → Bulk SMS) nothing is sent; the activity log records what would have been.
 */

/** "Your registration is confirmed" with the dashboard link, in English so it fits one SMS (160 characters). */
export function registrationConfirmedSms(eventTitle: string): string {
  const what = /jubilee/i.test(eventTitle) ? "Golden Jubilee registration" : "event registration";
  return `Praktan Sabujian Parishad: your ${what} is confirmed. Ticket & payment slip: ${siteUrl("/dashboard")}`;
}

export type SmsOutcome = "sent" | "test-mode" | "no-phone" | "failed";

export async function smsRegistrationConfirmed(registrationId: string): Promise<SmsOutcome> {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, userId: true, event: { select: { title: true } }, user: { select: { email: true, profile: { select: { phone: true } } } } },
    });
    if (!reg) return "failed";
    const number = normalizeBdPhoneNumber(reg.user.profile?.phone ?? "");
    const base = { category: "SMS" as const, targetType: "EventRegistration", targetId: reg.id, actor: { id: reg.userId, email: reg.user.email } };
    if (!number || !isValidBdMobile(number)) {
      await logActivity({ ...base, action: "sms.confirmation_skipped", summary: `No mobile number for ${reg.user.email}: confirmation sent by email only` });
      return "no-phone";
    }
    const message = registrationConfirmedSms(reg.event.title);
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
  } catch (err) {
    console.warn(`[member-sms] Could not send the confirmation SMS (${(err as Error)?.name ?? "error"}).`);
    return "failed";
  }
}
