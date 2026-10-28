import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/app-error";

/**
 * One OK Wallet SMS confirms one payment: its TrxID may sit on a single registration
 * or donation only. Call inside the transaction that stores it; the unique keys on
 * both tables catch the race this check cannot.
 */
export async function assertMerchantTrxIdFree(
  tx: Prisma.TransactionClient,
  merchantTrxId: string,
  except: { registrationId?: string; donationId?: string } = {},
): Promise<void> {
  const [registration, donation] = await Promise.all([
    tx.eventRegistration.findFirst({ where: { merchantTrxId, id: except.registrationId ? { not: except.registrationId } : undefined }, select: { id: true } }),
    tx.donation.findFirst({ where: { merchantTrxId, id: except.donationId ? { not: except.donationId } : undefined }, select: { id: true } }),
  ]);
  if (registration || donation) {
    throw new AppError("DUPLICATE_MERCHANT_TRX", 409, `The SMS TrxID ${merchantTrxId} is already recorded for another ${registration ? "registration" : "donation"}. Check that you pasted the right SMS.`);
  }
}

/** True when a Prisma unique-key error is about merchantTrxId. */
export function isMerchantTrxClash(err: unknown): boolean {
  const e = err as { code?: string; meta?: unknown };
  return e?.code === "P2002" && JSON.stringify(e.meta ?? {}).includes("merchantTrxId");
}
