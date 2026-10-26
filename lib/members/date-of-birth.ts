import { AppError } from "@/lib/app-error";

/**
 * A member's date of birth, typed as YYYY-MM-DD (a date input). Required on the join
 * form, editable on the profile; only the member and the committee see it.
 */

export const MIN_MEMBER_AGE = 10;
export const MAX_MEMBER_AGE = 110;

const bad = (message: string) => new AppError("INVALID_DATE_OF_BIRTH", 400, message);

/** Whole years from `dob` to `today` (both calendar dates). */
export function ageOn(dob: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < dob.getUTCMonth() || (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * The date of birth as a UTC midnight Date. Blank gives null, or a 400 error when
 * `required`; anything that is not a real date for a living member is refused.
 */
export function parseDateOfBirth(raw: unknown, required: boolean, today = new Date()): Date | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    if (required) throw new AppError("DATE_OF_BIRTH_REQUIRED", 400, "Please enter your date of birth.");
    return null;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw bad("Please enter your date of birth as day, month and year.");
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rejects dates such as 2001-02-30, which Date would roll into March.
  if (date.getUTCFullYear() !== Number(m[1]) || date.getUTCMonth() !== Number(m[2]) - 1 || date.getUTCDate() !== Number(m[3])) {
    throw bad("That date does not exist. Please check your date of birth.");
  }
  const age = ageOn(date, today);
  if (age < MIN_MEMBER_AGE || age > MAX_MEMBER_AGE) throw bad("Please check your date of birth.");
  return date;
}

/** YYYY-MM-DD for a date input, or "" when unknown. */
export function dateOfBirthInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
