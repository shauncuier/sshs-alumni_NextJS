/**
 * SMS test mode, for trying the join form without spending SMS credit: verification
 * codes are not texted but shown on the form instead. It switches itself off after
 * TEST_MODE_HOURS so a forgotten switch never leaves the live site without real number
 * checks. Admins turn it on in Admin → Bulk SMS; every change is logged.
 */
import prisma from "@/lib/prisma";

const KEY = "sms-test-mode";
export const TEST_MODE_HOURS = 24;

export interface SmsTestMode {
  on: boolean;
  /** When it switches itself off (ISO), while on. */
  until: string | null;
  updatedBy: string | null;
}

export async function getSmsTestMode(now = Date.now()): Promise<SmsTestMode> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const until = row?.value ? Date.parse(row.value) : NaN;
  const on = Number.isFinite(until) && until > now;
  return { on, until: on ? new Date(until).toISOString() : null, updatedBy: row?.updatedBy ?? null };
}

/** True while test mode is on; false if the setting cannot be read (fail safe: real SMS). */
export async function smsTestModeOn(now = Date.now()): Promise<boolean> {
  try {
    return (await getSmsTestMode(now)).on;
  } catch {
    return false;
  }
}

export async function setSmsTestMode(on: boolean, adminEmail: string, now = Date.now()): Promise<SmsTestMode> {
  const value = on ? new Date(now + TEST_MODE_HOURS * 60 * 60_000).toISOString() : "";
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getSmsTestMode(now);
}
