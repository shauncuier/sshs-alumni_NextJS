/**
 * The wording of the SMS a member gets when the committee confirms their registration
 * (lib/member-sms.ts). The default is below; an admin can change it in Admin → Settings →
 * Payments, and every change is logged. Read on every confirmation, so a change needs no
 * restart. Kept in English: Bangla letters make a text Unicode (70 characters a part),
 * which costs two to three times as much.
 *
 * Placeholders: {event} becomes "Golden Jubilee" for the jubilee and "event" otherwise;
 * {link} becomes the dashboard link, where the ticket and payment slip are.
 */
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";

const KEY = "sms-text-registration-confirmed";

export const DEFAULT_REGISTRATION_SMS = "Dear ExSabujian, your {event} registration is confirmed. Ticket & payment slip: {link}";
export const SMS_TEXT_MAX = 320;

export interface RegistrationSmsText {
  text: string;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Fills {event} and {link} into the wording. */
export function fillRegistrationSms(template: string, eventTitle: string, link: string): string {
  const event = /jubilee/i.test(eventTitle) ? "Golden Jubilee" : "event";
  return template.replaceAll("{event}", event).replaceAll("{link}", link);
}

export async function getRegistrationSmsText(): Promise<RegistrationSmsText> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const text = row?.value.trim();
  return {
    text: text || DEFAULT_REGISTRATION_SMS,
    isDefault: !text,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

/** The wording to send now; the default if the setting cannot be read. */
export async function registrationSmsTemplate(): Promise<string> {
  try {
    return (await getRegistrationSmsText()).text;
  } catch {
    return DEFAULT_REGISTRATION_SMS;
  }
}

/** Saves new wording; null or an empty text goes back to the default. */
export async function setRegistrationSmsText(next: unknown, adminEmail: string): Promise<RegistrationSmsText> {
  if (next !== null && typeof next !== "string") throw new AppError("INVALID_INPUT", 400, "Write the SMS text, or reset it to the default.");
  const text = (next ?? "").replace(/\s+/g, " ").trim();
  if (text.length > SMS_TEXT_MAX) throw new AppError("INVALID_INPUT", 400, `The SMS text can be at most ${SMS_TEXT_MAX} characters.`);
  if (!text || text === DEFAULT_REGISTRATION_SMS) {
    await prisma.setting.deleteMany({ where: { key: KEY } });
  } else {
    await prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: text, updatedBy: adminEmail },
      update: { value: text, updatedBy: adminEmail },
    });
  }
  return getRegistrationSmsText();
}
