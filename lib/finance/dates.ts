import { AppError } from "@/lib/app-error";

/**
 * Voucher dates are calendar days (DATE columns), kept as UTC midnight of the
 * Dhaka date so a voucher entered late in the evening keeps its day.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today in Dhaka as YYYY-MM-DD. */
export function todayYmd(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

/** The Dhaka calendar day of a moment, as a UTC-midnight Date for a DATE column. */
export function dhakaDay(at: Date): Date {
  return ymdToDate(todayYmd(at));
}

export function ymdToDate(ymd: string): Date {
  const m = YMD.exec(ymd);
  if (!m) throw new AppError("INVALID_DATE", 400, "Please give the date as year-month-day.");
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) throw new AppError("INVALID_DATE", 400, "That date does not exist.");
  return d;
}

export function dateToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A date filter value (YYYY-MM-DD) or undefined for blank; refuses anything else. */
export function optionalYmd(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || !YMD.test(v)) throw new AppError("INVALID_DATE", 400, "Dates must be year-month-day.");
  ymdToDate(v);
  return v;
}

/** 1 January and 31 December of a year, as YYYY-MM-DD. */
export function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
