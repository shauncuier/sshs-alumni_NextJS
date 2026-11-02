/**
 * Whether confirming a Bangla QR payment needs the TrxID from the association's OK Wallet
 * SMS. Off by default: the admin may type it (or paste the SMS) but does not have to.
 * Admins switch it in Admin → Settings → Payments. A TrxID that is given is still checked
 * and can confirm one payment only (lib/payments/merchant-trx.ts).
 */
import prisma from "@/lib/prisma";
import { normalizeMerchantTrxId } from "@/lib/payments/bangla-qr";

const KEY = "bangla-qr-trx-required";

export interface BanglaQrTrxSetting {
  required: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getBanglaQrTrxSetting(): Promise<BanglaQrTrxSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return { required: row?.value === "on", updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: row?.updatedBy ?? null };
}

export async function banglaQrTrxRequired(): Promise<boolean> {
  try {
    return (await getBanglaQrTrxSetting()).required;
  } catch {
    return false;
  }
}

export async function setBanglaQrTrxRequired(required: boolean, adminEmail: string): Promise<BanglaQrTrxSetting> {
  const value = required ? "on" : "off";
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getBanglaQrTrxSetting();
}

/** The SMS TrxID to store when confirming: checked when given; empty is allowed unless the setting requires it. */
export async function readMerchantTrxId(value: unknown): Promise<string | undefined> {
  if (!String(value ?? "").trim() && !(await banglaQrTrxRequired())) return undefined;
  return normalizeMerchantTrxId(value);
}
