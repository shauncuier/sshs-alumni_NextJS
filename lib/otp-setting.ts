/**
 * Whether members must prove their mobile number with a one-time code (SMS, or the
 * email fallback) when they join or change the number on their profile. On by default.
 * Admins switch it in Admin → Bulk SMS; with it off, the number is taken as typed
 * (still a valid Bangladeshi mobile that no other account uses). Every change is logged.
 */
import prisma from "@/lib/prisma";

const KEY = "otp-required";

export interface OtpSetting {
  required: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getOtpSetting(): Promise<OtpSetting> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return { required: row?.value !== "off", updatedAt: row?.updatedAt.toISOString() ?? null, updatedBy: row?.updatedBy ?? null };
}

/** True unless an admin switched codes off; true if the setting cannot be read (fail safe: codes required). */
export async function otpRequired(): Promise<boolean> {
  try {
    return (await getOtpSetting()).required;
  } catch {
    return true;
  }
}

export async function setOtpRequired(required: boolean, adminEmail: string): Promise<OtpSetting> {
  const value = required ? "on" : "off";
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  });
  return getOtpSetting();
}
