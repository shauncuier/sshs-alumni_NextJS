/**
 * How an event's date is shown. While the committee has not fixed the date
 * (Event.dateTentative), it reads "Around 26 December 2026 (date to be confirmed)"
 * instead of a firm "Saturday, 26 December 2026". Safe to import in the browser.
 */

/** Noon in Dhaka on the event's calendar day, so the day never shifts with the viewer's time zone. */
function dhakaDay(date: string | Date): Date {
  const ymd = typeof date === "string" ? date.slice(0, 10) : new Date(date.getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
  return new Date(`${ymd}T12:00:00+06:00`);
}

const fmt = (date: string | Date, locale: string, options: Intl.DateTimeFormatOptions) =>
  dhakaDay(date).toLocaleDateString(locale, { ...options, timeZone: "Asia/Dhaka" });

/** "Saturday, 26 December 2026" or "Around 26 December 2026 (date to be confirmed)". */
export function eventDateLabel(date: string | Date, tentative: boolean): string {
  return tentative
    ? `Around ${fmt(date, "en-GB", { day: "numeric", month: "long", year: "numeric" })} (date to be confirmed)`
    : fmt(date, "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "26 Dec 2026" or "~26 Dec 2026 (approx.)", for cards and lists. */
export function eventDateShort(date: string | Date, tentative: boolean): string {
  const d = fmt(date, "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return tentative ? `~${d} (approx.)` : d;
}

/** "শনিবার, ২৬ ডিসেম্বর ২০২৬" or "আনুমানিক ২৬ ডিসেম্বর ২০২৬ (তারিখ চূড়ান্ত হয়নি)". */
export function eventDateLabelBn(date: string | Date, tentative: boolean): string {
  return tentative
    ? `আনুমানিক ${fmt(date, "bn-BD", { day: "numeric", month: "long", year: "numeric" })} (তারিখ চূড়ান্ত হয়নি)`
    : fmt(date, "bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
