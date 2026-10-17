/**
 * One mobile number, one account. Numbers are stored as 01XXXXXXXXX (localBdPhone),
 * but older rows may hold +8801…, 8801… or spaces, so a match compares the last ten
 * digits. Checked before an SMS code is sent (no wasted SMS), and again when a number
 * is saved: joining, changing it on the profile, and an admin adding a member. The
 * unique index on AlumniProfile.phone is the last guard against two at once.
 */
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/app-error";
import prisma from "@/lib/prisma";
import { isValidBdMobile, normalizeBdPhoneNumber } from "@/lib/bulksmsbd";

type Db = Prisma.TransactionClient | typeof prisma;

export const PHONE_TAKEN_MESSAGE =
  "This mobile number is already registered to another account. Sign in with that account, or write to the committee if the number is yours.";

/** 01XXXXXXXXX for any way of writing a Bangladeshi mobile number, or throws INVALID_PHONE. */
export function canonicalPhone(raw: unknown): string {
  const normalized = typeof raw === "string" ? normalizeBdPhoneNumber(raw) : null;
  if (!normalized || !isValidBdMobile(normalized)) {
    throw new AppError("INVALID_PHONE", 400, "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
  }
  return `0${normalized.slice(3)}`;
}

/** Whether another account already uses this number (any status: pending, approved or rejected). */
export async function phoneTaken(phone: string, opts: { exceptUserId?: string | null; db?: Db } = {}): Promise<boolean> {
  const last10 = canonicalPhone(phone).slice(1);
  const rows = await (opts.db ?? prisma).alumniProfile.findMany({
    where: { phone: { endsWith: last10 }, ...(opts.exceptUserId ? { NOT: { userId: opts.exceptUserId } } : {}) },
    select: { phone: true },
    take: 10,
  });
  return rows.some((r) => (r.phone ?? "").replace(/\D/g, "").endsWith(last10));
}

/** Throws PHONE_TAKEN (409) when another account already uses this number. */
export async function requirePhoneFree(phone: string, opts: { exceptUserId?: string | null; db?: Db } = {}): Promise<void> {
  if (await phoneTaken(phone, opts)) throw new AppError("PHONE_TAKEN", 409, PHONE_TAKEN_MESSAGE);
}

/** True for a unique-index clash on the phone column (two saves at the same moment). */
export function isPhoneClash(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  // The MariaDB adapter names the index under meta.driverAdapterError, not meta.target.
  return JSON.stringify(err.meta ?? {}).includes("phone");
}
