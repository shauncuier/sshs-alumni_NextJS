/**
 * Verifying a mobile number is optional. Members whose number on file was never
 * verified (paper entries, older accounts, joined while codes were off) are reminded:
 * a banner on their profile, a card on the dashboard and one bell notification, all
 * gone once the number is verified. A verified number lets them reset their password
 * by SMS (lib/password-reset.ts).
 */
import { AppError } from "@/lib/app-error";
import prisma from "@/lib/prisma";
import { readVerifiedPhone } from "@/lib/phone-otp";
import { canonicalPhone, requirePhoneFree } from "@/lib/phone-registry";

export const PHONE_REMINDER_TYPE = "PHONE_VERIFY";
export const PHONE_REMINDER_LINK = "/profile#verify-phone";

// Members already checked by this server process, so the bell's polling does not
// query for the reminder every time; and checks in progress, so two polls at the
// same moment create one notification, not two.
const checked = new Set<string>();
const inFlight = new Map<string, Promise<boolean>>();

/** For tests: forget which members were checked. */
export function resetPhoneReminderCache(): void {
  checked.clear();
  inFlight.clear();
}

/**
 * Creates the one "Verify your mobile number" notification for a member whose number is
 * not verified, unless they already had it. Returns whether one was created. Never throws:
 * a reminder must not break loading the notifications.
 */
export async function ensurePhoneReminder(userId: string): Promise<boolean> {
  if (checked.has(userId)) return false;
  const running = inFlight.get(userId);
  if (running) return running;
  const job = (async () => {
    try {
      const profile = await prisma.alumniProfile.findUnique({ where: { userId }, select: { phone: true, phoneVerifiedAt: true } });
      if (!profile?.phone || profile.phoneVerifiedAt) {
        checked.add(userId);
        return false;
      }
      const had = await prisma.notification.count({ where: { userId, type: PHONE_REMINDER_TYPE } });
      checked.add(userId);
      if (had > 0) return false;
      await prisma.notification.create({
        data: {
          userId,
          type: PHONE_REMINDER_TYPE,
          title: "Verify your mobile number",
          message: "It is optional and takes a minute: we send a code to your number. A verified number lets you reset your password by SMS.",
          link: PHONE_REMINDER_LINK,
          isRead: false,
        },
      });
      return true;
    } catch (err) {
      console.warn(`[phone-reminder] Could not check the reminder (${(err as Error)?.name ?? "error"}).`);
      return false;
    } finally {
      inFlight.delete(userId);
    }
  })();
  inFlight.set(userId, job);
  return job;
}

/**
 * Marks the member's own number on file as verified, proved by an SMS code
 * (verificationToken from /api/auth/phone-otp/verify for that number). Also clears
 * the reminder from their bell. Returns when it was verified.
 */
export async function verifyOwnPhone(userId: string, verificationToken: unknown): Promise<Date> {
  const profile = await prisma.alumniProfile.findUnique({ where: { userId }, select: { phone: true, phoneVerifiedAt: true } });
  if (!profile?.phone) throw new AppError("NO_PHONE", 400, "Add your mobile number to your profile first.");
  const onFile = canonicalPhone(profile.phone);
  if (readVerifiedPhone(verificationToken) !== onFile) {
    throw new AppError("PHONE_NOT_VERIFIED", 400, "That code was for a different number. Please try again.");
  }
  await requirePhoneFree(onFile, { exceptUserId: userId });
  const verifiedAt = profile.phoneVerifiedAt ?? new Date();
  await prisma.$transaction([
    prisma.alumniProfile.update({ where: { userId }, data: { phoneVerifiedAt: verifiedAt } }),
    prisma.notification.updateMany({ where: { userId, type: PHONE_REMINDER_TYPE, isRead: false }, data: { isRead: true } }),
  ]);
  checked.add(userId);
  return verifiedAt;
}
