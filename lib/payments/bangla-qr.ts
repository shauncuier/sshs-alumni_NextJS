import { AppError } from "@/lib/app-error";

/**
 * Matching a Bangla QR payment to the person who made it. The payer's app and the
 * association's OK Wallet number the same payment differently, so the transaction ID
 * the member types never matches the TrxID in the association's SMS. What both sides
 * share is the amount, the time to the minute and the payer's account, which the SMS
 * shows masked ("0182***5517"). The member gives the last 4 digits and the time; the
 * admin pastes the SMS, and its TrxID is recorded so one SMS can't confirm two payments.
 * Safe to import in the browser.
 */

export const BANGLA_QR = "Bangla QR";

/** Payments typed with a time this far from the SMS still count as the same minute. */
const TIME_TOLERANCE_MS = 30 * 60_000;
// Bangladesh has no daylight saving: Dhaka is always UTC+6.
const DHAKA_OFFSET_MS = 6 * 3_600_000;

export function isBanglaQr(method: string | null | undefined): boolean {
  return method === BANGLA_QR;
}

/** The last 4 digits of the paying account, or a 400 the member can act on. */
export function normalizeLast4(value: unknown): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(digits)) {
    throw new AppError("INVALID_ACCOUNT_DIGITS", 400, "Type the last 4 digits of the number or account you paid from.");
  }
  return digits;
}

/** When the member says they paid: a real time, not in the future, not older than 60 days. */
export function normalizePaidAt(value: unknown, now = new Date()): Date {
  const at = new Date(String(value ?? ""));
  if (Number.isNaN(at.getTime())) {
    throw new AppError("INVALID_PAYMENT_TIME", 400, "Enter the date and time shown on your payment receipt.");
  }
  if (at.getTime() > now.getTime() + 60 * 60_000 || at.getTime() < now.getTime() - 60 * 86_400_000) {
    throw new AppError("INVALID_PAYMENT_TIME", 400, "The payment time must be the date and time shown on your receipt, within the last 60 days.");
  }
  return at;
}

/** The association's SMS TrxID as stored: letters and digits, upper case. */
export function normalizeMerchantTrxId(value: unknown): string {
  const id = String(value ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,40}$/.test(id)) {
    throw new AppError("MERCHANT_TRX_REQUIRED", 400, "Enter the TrxID from the association's OK Wallet SMS for this payment (or paste the SMS).");
  }
  return id;
}

export interface WalletSms {
  amount: number | null;
  /** As the SMS shows it, e.g. "0182***5517". */
  accountMasked: string | null;
  last4: string | null;
  trxId: string | null;
  at: Date | null;
}

/**
 * Reads an OK Wallet merchant SMS such as "Payment received TK 1250 from BANQR A/C
 * 0182***5517 is successful. Balance TK 5800. TrxID 72610280154891 at 28/10/26 23:29".
 * Line breaks and spacing don't matter; a field that isn't found is null.
 */
export function parseWalletSms(text: string): WalletSms {
  const t = text.replace(/\s+/g, " ");
  const amount = /received\s*(?:TK|Tk|৳|BDT)\.?\s*([\d,]+(?:\.\d+)?)/i.exec(t) ?? /(?:TK|Tk|৳|BDT)\.?\s*([\d,]+(?:\.\d+)?)/i.exec(t);
  const account = /A\/C\s*([0-9]{2,6}\s*\*+\s*[0-9]{3,6})/i.exec(t);
  const trx = /Trx\s*ID[:\s#]*([A-Za-z0-9]{6,40})/i.exec(t);
  const time = /\bat\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/i.exec(t);

  const accountMasked = account ? account[1].replace(/\s+/g, "") : null;
  let at: Date | null = null;
  if (time) {
    const [d, m, y, hh, mm] = time.slice(1).map(Number);
    const year = time[3].length === 2 ? 2000 + y : y;
    const utc = Date.UTC(year, m - 1, d, hh, mm) - DHAKA_OFFSET_MS;
    at = Number.isNaN(utc) ? null : new Date(utc);
  }
  return {
    amount: amount ? Number(amount[1].replace(/,/g, "")) : null,
    accountMasked,
    last4: accountMasked ? accountMasked.slice(-4) : null,
    trxId: trx ? trx[1].toUpperCase() : null,
    at,
  };
}

/** "28/10/26 23:29", the way the OK Wallet SMS writes times, in Dhaka time. */
export function smsTime(at: Date): string {
  const d = new Date(at.getTime() + DHAKA_OFFSET_MS);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${two(d.getUTCFullYear() % 100)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
}

/** What to look for in the OK Wallet SMS, e.g. "TK 1,250 from …5517 at 28/10/26 23:29". */
export function matchLine(p: { amount: number; last4: string | null; paidAt: Date | string | null }): string {
  const parts = [`TK ${p.amount.toLocaleString("en-IN")}`];
  if (p.last4) parts.push(`from …${p.last4}`);
  if (p.paidAt) parts.push(`at ${smsTime(new Date(p.paidAt))}`);
  return parts.join(" ");
}

export interface SmsCheck {
  amount: boolean | null;
  last4: boolean | null;
  time: boolean | null;
}

/** Whether a pasted SMS agrees with the payment the member reported (null: nothing to compare). */
export function checkSms(sms: WalletSms, p: { amount: number; last4: string | null; paidAt: Date | string | null }): SmsCheck {
  return {
    amount: sms.amount === null ? null : Math.abs(sms.amount - p.amount) < 0.01,
    last4: sms.last4 === null || !p.last4 ? null : sms.last4 === p.last4,
    time: sms.at === null || !p.paidAt ? null : Math.abs(sms.at.getTime() - new Date(p.paidAt).getTime()) <= TIME_TOLERANCE_MS,
  };
}
