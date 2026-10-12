import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { contentImageId, removeContentImage } from "@/lib/media/content-images";

/**
 * Where members send money (manual payment, roadmap step 5), for the whole site:
 * which methods are accepted (bKash, Nagad, Bangla QR, bank, cash) and their
 * details. Admins edit them in /admin/payments; event registration, joining and
 * /donate all use them (an event may add its own extra instructions). Read through
 * GET /api/payment-settings, so a change needs no rebuild. Until an admin saves
 * them, the old NEXT_PUBLIC_* environment values are used.
 */

/** Every method the site knows, in display order. */
export const PAYMENT_METHOD_NAMES = ["bKash", "Nagad", "Bangla QR", "Bank", "Cash"] as const;
export type PaymentMethodName = (typeof PAYMENT_METHOD_NAMES)[number];

export const BKASH_ACCOUNT_TYPES = ["Personal", "Agent", "Merchant"] as const;
export type BkashAccountType = (typeof BKASH_ACCOUNT_TYPES)[number];

export interface PaymentSettings {
  bkashNumber: string;
  bkashType: BkashAccountType;
  nagadNumber: string;
  nagadType: BkashAccountType;
  bankDetails: string;
  banglaQrImage: string;
  banglaQrMerchant: string;
  /** Where and to whom cash is paid. */
  cashDetails: string;
  note: string;
  /** Methods the admin switched on; a method also needs its details to be offered. */
  enabledMethods: PaymentMethodName[];
  updatedAt: string | null;
  updatedBy: string | null;
}

const KEY = "payment";
const EMPTY: Omit<PaymentSettings, "updatedAt" | "updatedBy"> = {
  bkashNumber: "",
  bkashType: "Personal",
  nagadNumber: "",
  nagadType: "Personal",
  bankDetails: "",
  banglaQrImage: "",
  banglaQrMerchant: "",
  cashDetails: "",
  note: "",
  enabledMethods: [],
};

/** Settings saved before the on/off switches existed: every method with details is on. */
function defaultEnabled(s: Partial<PaymentSettings>): PaymentMethodName[] {
  const on: PaymentMethodName[] = [];
  if (s.bkashNumber) on.push("bKash");
  if (s.nagadNumber) on.push("Nagad");
  if (s.banglaQrImage) on.push("Bangla QR");
  if (s.bankDetails) on.push("Bank");
  return on;
}

function fromEnv(): Omit<PaymentSettings, "updatedAt" | "updatedBy"> {
  return {
    ...EMPTY,
    banglaQrImage: process.env.NEXT_PUBLIC_BANGLA_QR_IMAGE || "",
    banglaQrMerchant: process.env.NEXT_PUBLIC_BANGLA_QR_MERCHANT || "",
    note: (process.env.NEXT_PUBLIC_DONATION_INSTRUCTIONS || "").split("|").map((l) => l.trim()).filter(Boolean).join("\n"),
    enabledMethods: process.env.NEXT_PUBLIC_BANGLA_QR_IMAGE ? ["Bangla QR"] : [],
  };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return { ...fromEnv(), updatedAt: null, updatedBy: null };
  let stored: Partial<PaymentSettings> = {};
  try {
    stored = JSON.parse(row.value);
  } catch {
    // A damaged value falls back to empty fields rather than breaking the payment pages.
  }
  const enabledMethods = Array.isArray(stored.enabledMethods)
    ? PAYMENT_METHOD_NAMES.filter((m) => stored.enabledMethods!.includes(m))
    : defaultEnabled(stored);
  return { ...EMPTY, ...stored, enabledMethods, updatedAt: row.updatedAt.toISOString(), updatedBy: row.updatedBy };
}

/** The methods members can pay with: switched on and with their details filled in. */
export function availableMethods(s: PaymentSettings): PaymentMethodName[] {
  const ready: Record<PaymentMethodName, boolean> = {
    bKash: Boolean(s.bkashNumber),
    Nagad: Boolean(s.nagadNumber),
    "Bangla QR": Boolean(s.banglaQrImage),
    Bank: Boolean(s.bankDetails.trim()),
    Cash: true,
  };
  return PAYMENT_METHOD_NAMES.filter((m) => s.enabledMethods.includes(m) && ready[m]);
}

/** Lines to show members under "How to pay", for the available methods, in a fixed order. */
export function paymentLines(s: PaymentSettings): string[] {
  const on = new Set(availableMethods(s));
  const split = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines: string[] = [];
  if (on.has("bKash")) lines.push(`bKash (${s.bkashType}): ${s.bkashNumber}`);
  if (on.has("Nagad")) lines.push(`Nagad (${s.nagadType}): ${s.nagadNumber}`);
  if (on.has("Bangla QR")) lines.push(`Bangla QR: scan the code with any bank or mobile banking app${s.banglaQrMerchant ? ` (${s.banglaQrMerchant})` : ""}`);
  if (on.has("Bank")) lines.push(...split(s.bankDetails));
  if (on.has("Cash")) lines.push(s.cashDetails.trim() ? `Cash: ${split(s.cashDetails).join(" ")}` : "Cash: to a committee member, who gives you a receipt number");
  if (lines.length > 0 && s.note) lines.push(...split(s.note));
  return lines;
}

/** Whether members can be asked to pay at all (at least one method is available). */
export async function paymentReady(): Promise<boolean> {
  return availableMethods(await getPaymentSettings()).length > 0;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (message: string) => new AppError("INVALID_PAYMENT_SETTINGS", 400, message);

function mobile(value: unknown, label: string): string {
  const raw = str(value, 20).replace(/[\s-]/g, "");
  if (!raw) return "";
  const local = raw.replace(/^\+?880/, "0");
  if (!/^01[3-9]\d{8}$/.test(local)) throw bad(`Please enter the ${label} number as an 11-digit Bangladeshi mobile number (01XXXXXXXXX).`);
  return local;
}

function accountType(value: unknown): BkashAccountType {
  return (BKASH_ACCOUNT_TYPES as readonly string[]).includes(value as string) ? (value as BkashAccountType) : "Personal";
}

export interface PaymentSettingsInput {
  bkashNumber?: unknown;
  bkashType?: unknown;
  nagadNumber?: unknown;
  nagadType?: unknown;
  bankDetails?: unknown;
  banglaQrImage?: unknown;
  banglaQrMerchant?: unknown;
  cashDetails?: unknown;
  note?: unknown;
  enabledMethods?: unknown;
}

export async function updatePaymentSettings(input: PaymentSettingsInput, adminEmail: string): Promise<{ before: PaymentSettings; after: PaymentSettings }> {
  const before = await getPaymentSettings();
  const qr = str(input.banglaQrImage, 500);
  // Only images uploaded through the admin panel (or the image already in use).
  if (qr && qr !== before.banglaQrImage && !contentImageId(qr)) throw bad("Please upload the Bangla QR image instead of linking to it.");
  const next = {
    bkashNumber: mobile(input.bkashNumber, "bKash"),
    bkashType: accountType(input.bkashType),
    nagadNumber: mobile(input.nagadNumber, "Nagad"),
    nagadType: accountType(input.nagadType),
    bankDetails: str(input.bankDetails, 1000).replace(/\r\n/g, "\n"),
    banglaQrImage: qr,
    banglaQrMerchant: str(input.banglaQrMerchant, 120),
    cashDetails: str(input.cashDetails, 500).replace(/\r\n/g, "\n"),
    note: str(input.note, 1000).replace(/\r\n/g, "\n"),
    enabledMethods: Array.isArray(input.enabledMethods)
      ? PAYMENT_METHOD_NAMES.filter((m) => (input.enabledMethods as unknown[]).includes(m))
      : [],
  };
  // Callers that do not send the switches (older forms, scripts): every method with details is on.
  if (!Array.isArray(input.enabledMethods)) next.enabledMethods = defaultEnabled(next);
  // A method switched on needs its details, or members would be told to pay into nothing.
  const missing: Record<PaymentMethodName, string | null> = {
    bKash: next.bkashNumber ? null : "the bKash number",
    Nagad: next.nagadNumber ? null : "the Nagad number",
    "Bangla QR": next.banglaQrImage ? null : "the Bangla QR image",
    Bank: next.bankDetails ? null : "the bank account details",
    Cash: null,
  };
  for (const m of next.enabledMethods) {
    if (missing[m]) throw bad(`${m} is switched on: please add ${missing[m]}, or switch it off.`);
  }
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next), updatedBy: adminEmail },
    update: { value: JSON.stringify(next), updatedBy: adminEmail },
  });
  if (before.banglaQrImage && before.banglaQrImage !== next.banglaQrImage) await removeContentImage(before.banglaQrImage);
  return { before, after: await getPaymentSettings() };
}
