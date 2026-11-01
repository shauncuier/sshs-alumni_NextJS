/**
 * The association's contact phone numbers shown in the footer and on the contact page.
 * Browser-safe: the defaults and the checks are shared by the admin form and the server
 * (lib/contact-phones.ts stores the list; Admin → Settings → Contact numbers edits it).
 */
import { AppError } from "@/lib/app-error";

export interface ContactPhone {
  number: string;
  /** Whom to ask for, e.g. "General Secretary"; null shows the number alone. */
  name: string | null;
}

export const MAX_CONTACT_PHONES = 6;
export const CONTACT_NAME_MAX = 60;

/** Used until an admin saves a list, and if the saved list cannot be read. */
export const DEFAULT_CONTACT_PHONES: ContactPhone[] = [
  { number: "+880 1818-521472", name: null },
  { number: "+880 1818-869523", name: null },
  { number: "+880 1835-927634", name: null },
];

/** "+880 1818-521472" for a Bangladeshi mobile in any format; other numbers as typed, tidied. */
export function formatContactNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (/^1[3-9]\d{8}$/.test(local)) return `+880 ${local.slice(0, 4)}-${local.slice(4)}`;
  return raw.trim().replace(/\s+/g, " ");
}

/** The href for a number: digits and a leading + only. */
export function telHref(number: string): string {
  return `tel:${number.replace(/[^+\d]/g, "")}`;
}

/** Checks and tidies a list from the admin form; throws a 400 the form can show. */
export function normalizeContactPhones(input: unknown): ContactPhone[] {
  if (!Array.isArray(input)) throw new AppError("INVALID_CONTACT_PHONES", 400, "Send a list of contact numbers.");
  const list: ContactPhone[] = [];
  for (const item of input) {
    const rawNumber = typeof item?.number === "string" ? item.number.trim() : "";
    const rawName = typeof item?.name === "string" ? item.name.trim().replace(/\s+/g, " ") : "";
    if (!rawNumber && !rawName) continue; // an empty row
    if (!/^\+?[\d\s()-]+$/.test(rawNumber) || rawNumber.replace(/\D/g, "").length < 6 || rawNumber.replace(/\D/g, "").length > 15) {
      throw new AppError("INVALID_CONTACT_PHONES", 400, `"${rawNumber || rawName}" is not a phone number.`);
    }
    if (rawName.length > CONTACT_NAME_MAX) {
      throw new AppError("INVALID_CONTACT_PHONES", 400, `Please keep each name to ${CONTACT_NAME_MAX} characters or fewer.`);
    }
    const number = formatContactNumber(rawNumber);
    if (list.some((p) => p.number.replace(/\D/g, "") === number.replace(/\D/g, ""))) {
      throw new AppError("INVALID_CONTACT_PHONES", 400, `${number} is in the list twice.`);
    }
    list.push({ number, name: rawName || null });
  }
  if (list.length === 0) throw new AppError("INVALID_CONTACT_PHONES", 400, "Give at least one contact number.");
  if (list.length > MAX_CONTACT_PHONES) {
    throw new AppError("INVALID_CONTACT_PHONES", 400, `Up to ${MAX_CONTACT_PHONES} contact numbers.`);
  }
  return list;
}
