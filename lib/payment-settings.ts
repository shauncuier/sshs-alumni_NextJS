import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { contentImageId, removeContentImage } from "@/lib/media/content-images";

/**
 * Where members send money (manual payment, roadmap step 5): bKash and Nagad
 * numbers, bank account details and the bank-issued Bangla QR image. Admins edit
 * them in /admin/donations; /donate and the join form read them through
 * GET /api/payment-settings, so a change needs no rebuild. Until an admin saves
 * them, the old NEXT_PUBLIC_* environment values are used.
 */

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
  note: string;
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
  note: "",
};

function fromEnv(): Omit<PaymentSettings, "updatedAt" | "updatedBy"> {
  return {
    ...EMPTY,
    banglaQrImage: process.env.NEXT_PUBLIC_BANGLA_QR_IMAGE || "",
    banglaQrMerchant: process.env.NEXT_PUBLIC_BANGLA_QR_MERCHANT || "",
    note: (process.env.NEXT_PUBLIC_DONATION_INSTRUCTIONS || "").split("|").map((l) => l.trim()).filter(Boolean).join("\n"),
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
  return { ...EMPTY, ...stored, updatedAt: row.updatedAt.toISOString(), updatedBy: row.updatedBy };
}

/** Lines to show members under "How to pay", in a fixed order. */
export function paymentLines(s: PaymentSettings): string[] {
  const lines: string[] = [];
  if (s.bkashNumber) lines.push(`bKash (${s.bkashType}): ${s.bkashNumber}`);
  if (s.nagadNumber) lines.push(`Nagad (${s.nagadType}): ${s.nagadNumber}`);
  if (s.bankDetails) lines.push(...s.bankDetails.split("\n").map((l) => l.trim()).filter(Boolean));
  if (s.note) lines.push(...s.note.split("\n").map((l) => l.trim()).filter(Boolean));
  return lines;
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
  note?: unknown;
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
    note: str(input.note, 1000).replace(/\r\n/g, "\n"),
  };
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next), updatedBy: adminEmail },
    update: { value: JSON.stringify(next), updatedBy: adminEmail },
  });
  if (before.banglaQrImage && before.banglaQrImage !== next.banglaQrImage) await removeContentImage(before.banglaQrImage);
  return { before, after: await getPaymentSettings() };
}
