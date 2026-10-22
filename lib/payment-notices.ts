/**
 * Whether members get an SMS and/or an email when the committee confirms their payment
 * (an event registration or joining, a donation). Both are on until an admin turns one
 * off in Admin → Payments; every change is logged. Read on every confirmation, so a
 * change needs no restart.
 */
import prisma from "@/lib/prisma";

const KEY = "payment-notices";

export interface PaymentNotices {
  sms: boolean;
  email: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getPaymentNotices(): Promise<PaymentNotices> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let stored: { sms?: unknown; email?: unknown } = {};
  try {
    stored = row ? JSON.parse(row.value) : {};
  } catch {
    // A damaged value keeps both on: a member is better told twice than not at all.
  }
  return {
    sms: stored.sms !== false,
    email: stored.email !== false,
    updatedAt: row?.updatedAt.toISOString() ?? null,
    updatedBy: row?.updatedBy ?? null,
  };
}

/** The switches for one confirmation; both on if the setting cannot be read. */
export async function paymentNoticesOn(): Promise<{ sms: boolean; email: boolean }> {
  try {
    const { sms, email } = await getPaymentNotices();
    return { sms, email };
  } catch {
    return { sms: true, email: true };
  }
}

export async function setPaymentNotices(next: { sms: boolean; email: boolean }, adminEmail: string): Promise<PaymentNotices> {
  const value = JSON.stringify({ sms: next.sms, email: next.email });
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getPaymentNotices();
}
