/**
 * "Forgot password?" by SMS code (/forgot-password). The member types the mobile
 * number on their account, proves they hold that phone with a code (the usual
 * /api/auth/phone-otp/verify step), then sets a new password. Every session is
 * signed out (sessionVersion), and a number that was never verified is marked
 * verified, since the code just proved it.
 *
 * Not for the super admin (SUPER_ADMIN_PASSWORD in the server environment would
 * overwrite it at the next restart), and never in SMS test mode (lib/phone-otp.ts).
 */
import bcrypt from "bcryptjs";
import { AppError } from "@/lib/app-error";
import prisma from "@/lib/prisma";
import { canonicalPhone } from "@/lib/phone-registry";
import { readVerifiedPhone, requestPhoneOtp } from "@/lib/phone-otp";
import { isEnvSuperAdmin } from "@/lib/admin/super-admin";
import { resetRateLimit } from "@/lib/request-security";

export const MIN_PASSWORD_LENGTH = 8;

const NO_ACCOUNT_MESSAGE = "No account has this mobile number. Check the number, or ask the committee to reset your password.";

/** The account whose profile holds this number (stored as 01XXXXXXXXX, older rows in other formats). */
async function accountForPhone(raw: unknown) {
  const last10 = canonicalPhone(raw).slice(1);
  const rows = await prisma.alumniProfile.findMany({
    where: { phone: { endsWith: last10 } },
    select: { id: true, phone: true, phoneVerifiedAt: true, user: { select: { id: true, email: true } } },
    take: 10,
  });
  return rows.find((r) => (r.phone ?? "").replace(/\D/g, "").endsWith(last10)) ?? null;
}

const superAdminRefused = () =>
  new AppError("RESET_NOT_ALLOWED", 403, "This account's password is set in the server settings. It cannot be reset here.");

/** Sends the reset code to a number that belongs to an account. */
export async function requestPasswordResetCode(rawPhone: unknown, now = Date.now()) {
  const account = await accountForPhone(rawPhone);
  if (!account) throw new AppError("NO_ACCOUNT", 404, NO_ACCOUNT_MESSAGE);
  if (isEnvSuperAdmin(account.user.email)) throw superAdminRefused();
  try {
    const sent = await requestPhoneOtp(rawPhone, now, { purpose: "reset" });
    return { ...sent, userId: account.user.id };
  } catch (err) {
    // The join form falls back to an email code; a reset has no such step.
    if (err instanceof AppError && (err.code === "SMS_FAILED" || err.code === "SMS_UNAVAILABLE")) {
      throw new AppError(err.code, err.status, "We could not send the SMS right now. Please try again later, or ask the committee to reset your password.");
    }
    throw err;
  }
}

// A verified-phone token works for one reset only (it stays valid for 30 minutes).
const usedTokens = new Map<string, number>();
function claimTokenOnce(token: string, now: number) {
  for (const [t, expires] of usedTokens) if (expires < now) usedTokens.delete(t);
  if (usedTokens.has(token)) throw new AppError("PHONE_NOT_VERIFIED", 400, "This code was already used. Please ask for a new one.");
  usedTokens.set(token, now + 60 * 60_000);
}

/** Sets the new password for the account holding the verified number. Returns its email. */
export async function resetPasswordWithPhone(verificationToken: unknown, newPassword: unknown, now = Date.now()) {
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("INVALID_PASSWORD", 400, `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (newPassword.length > 200) throw new AppError("INVALID_PASSWORD", 400, "The new password is too long.");
  const phone = readVerifiedPhone(verificationToken, now);
  const account = await accountForPhone(phone);
  if (!account) throw new AppError("NO_ACCOUNT", 404, NO_ACCOUNT_MESSAGE);
  if (isEnvSuperAdmin(account.user.email)) throw superAdminRefused();
  claimTokenOnce(String(verificationToken), now);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: account.user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    ...(account.phoneVerifiedAt ? [] : [prisma.alumniProfile.update({ where: { id: account.id }, data: { phoneVerifiedAt: new Date(now) } })]),
  ]);
  // A member locked out by wrong guesses can sign in with the new password straight away.
  resetRateLimit(`login:${account.user.email.trim().toLowerCase()}`);
  return { userId: account.user.id, email: account.user.email };
}
