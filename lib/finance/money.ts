import { AppError } from "@/lib/app-error";

/**
 * Money in the accounts is whole poisha (1/100 taka) in Int columns, so sums are exact.
 * The rest of the site keeps taka in Float columns; convert those with toPoisha.
 */

/** Largest single voucher: ৳1 crore. Keeps every amount far inside a 32-bit Int. */
export const MAX_ENTRY_POISHA = 1_000_000_000;

export function toPoisha(taka: number | null | undefined): number {
  return Math.round((Number(taka) || 0) * 100);
}

/** Taka with Bangladeshi grouping (৳1,25,000), poisha only when there are any (৳12.50). */
export function formatPoisha(poisha: number): string {
  const sign = poisha < 0 ? "−" : "";
  const abs = Math.abs(Math.round(poisha));
  const taka = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}৳${taka.toLocaleString("en-IN")}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/** Same as formatPoisha without the ৳ sign, for CSV cells and tables with a currency header. */
export function plainPoisha(poisha: number): string {
  const sign = poisha < 0 ? "-" : "";
  const abs = Math.abs(Math.round(poisha));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Reads "1,250", "1250.5" or 1250.5 as poisha; refuses zero, negatives and more than 2 decimals. */
export function parseAmount(input: unknown, label = "amount"): number {
  const raw = typeof input === "number" ? String(input) : typeof input === "string" ? input.replace(/[,\s৳]/g, "") : "";
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new AppError("INVALID_AMOUNT", 400, `Please enter the ${label} in taka, with at most 2 decimals.`);
  const [whole, frac = ""] = raw.split(".");
  const poisha = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (poisha <= 0) throw new AppError("INVALID_AMOUNT", 400, `The ${label} must be more than zero.`);
  if (poisha > MAX_ENTRY_POISHA) throw new AppError("INVALID_AMOUNT", 400, `The ${label} is too large for one voucher.`);
  return poisha;
}
