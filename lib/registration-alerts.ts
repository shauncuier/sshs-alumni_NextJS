/**
 * Emails to the committee when someone registers on the site (join form or any event).
 * Who receives them is a Setting admins change in Admin → Settings → Email; until it is
 * saved, the association's mailbox (CONTACT_INBOX_EMAIL, else info@exsabujian.org) does.
 * An empty list turns the alerts off. Paper forms are not alerted: the committee typed them.
 */
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { sendEmail } from "@/lib/email";
import { schoolInfo } from "@/lib/data";
import { newRegistrationAlertEmail } from "@/lib/email-templates";

const KEY = "registration-alert-emails";
export const MAX_ALERT_EMAILS = 5;

export interface RegistrationAlertSetting {
  emails: string[];
  updatedAt: string | null;
  updatedBy: string | null;
}

function defaultEmails(): string[] {
  return [process.env.CONTACT_INBOX_EMAIL?.trim() || schoolInfo.associationEmail];
}

/** Trimmed, lower-cased, without duplicates; a wrong address or too many is a 400. */
export function normalizeAlertEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) throw new AppError("INVALID_INPUT", 400, "Send a list of email addresses.");
  const emails = [...new Set(raw.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : "")).filter(Boolean))];
  const wrong = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 191);
  if (wrong) throw new AppError("INVALID_INPUT", 400, `"${wrong}" is not a valid email address.`);
  if (emails.length > MAX_ALERT_EMAILS) throw new AppError("INVALID_INPUT", 400, `At most ${MAX_ALERT_EMAILS} addresses.`);
  return emails;
}

export async function getRegistrationAlertSetting(): Promise<RegistrationAlertSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let emails = defaultEmails();
  if (row) {
    try {
      emails = normalizeAlertEmails(JSON.parse(row.value));
    } catch {
      // A damaged value: fall back to the association's mailbox rather than nobody.
    }
  }
  return { emails, updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: row?.updatedBy ?? null };
}

export async function setRegistrationAlertEmails(input: unknown, adminEmail: string): Promise<RegistrationAlertSetting> {
  const value = JSON.stringify(normalizeAlertEmails(input));
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getRegistrationAlertSetting();
}

/** Tells the committee about a new registration. Never throws; returns how many emails went out. */
export async function alertNewRegistration(registrationId: string, createdAccount: boolean): Promise<number> {
  try {
    const { emails } = await getRegistrationAlertSetting();
    if (emails.length === 0) return 0;
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true, user: { include: { profile: true } } },
    });
    if (!reg) return 0;
    const p = reg.user.profile;
    const email = newRegistrationAlertEmail({
      name: p?.fullName ?? reg.user.email,
      nameBn: p?.fullNameBn ?? null,
      sscBatch: p?.sscBatch ?? null,
      email: reg.user.email,
      phone: p?.phone ?? null,
      eventId: reg.event.id,
      eventTitle: reg.event.title,
      newMember: createdAccount,
      headCount: reg.headCount,
      totalFee: reg.totalFee,
      donationAmount: reg.donationAmount,
      paymentMethod: reg.paymentMethod,
      transactionId: reg.transactionId,
      awaitingPayment: reg.status === "PENDING_PAYMENT",
    });
    let sent = 0;
    for (const to of emails) {
      try {
        const res = await sendEmail({ to, replyTo: reg.user.email, ...email });
        if (res.success) sent++;
        else console.warn(`[registration-alerts] Could not email the committee (${res.error ?? "unknown error"}).`);
      } catch (err) {
        console.warn(`[registration-alerts] Could not email the committee (${(err as Error)?.name ?? "error"}).`);
      }
    }
    return sent;
  } catch (err) {
    console.warn(`[registration-alerts] Could not prepare the alert (${(err as Error)?.name ?? "error"}).`);
    return 0;
  }
}
