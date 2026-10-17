import { AppError } from "@/lib/app-error";
import { getBulkSmsConfig, isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { checkChallenge, issueChallenge, issueVerified, newOtpCode, OTP_RESEND_MS, readVerified } from "@/lib/otp";
import { consumeRateLimit } from "@/lib/request-security";
import { requirePhoneFree } from "@/lib/phone-registry";

/**
 * Phone verification by SMS one-time code (see lib/otp.ts for the token flow).
 * Registration calls readVerifiedPhone, so a phone saved as verified is always one
 * the member proved they receive SMS on. Only while the SMS service is down (a send
 * failed, or SMS is not set up) may members verify by email instead (lib/email-otp.ts).
 */

export { OTP_MAX_ATTEMPTS, OTP_RESEND_MS, OTP_TTL_MS, VERIFIED_TTL_MS } from "@/lib/otp";
export const OTP_SITE_HOURLY_LIMIT = 200;

/** How long after a failed SMS the email code stays on offer. */
export const SMS_OUTAGE_MS = 30 * 60_000;
let smsDownSince: number | null = null;

/** True while the SMS service is down: a send failed within SMS_OUTAGE_MS (or SMS is not set up). */
export function smsDown(now = Date.now()): boolean {
  if (!getBulkSmsConfig().isConfigured && process.env.NODE_ENV === "production") return true;
  return smsDownSince !== null && now - smsDownSince < SMS_OUTAGE_MS;
}

/** Records that the SMS service is down from `now` (a send failed). */
export function markSmsDown(now = Date.now()): void {
  smsDownSince = now;
}

/** Records that SMS works again (a send succeeded); also for tests. */
export function resetSmsOutage(): void {
  smsDownSince = null;
}

function smsOutage(now: number, err: AppError): AppError {
  markSmsDown(now);
  return err;
}

/** The brand in the SMS; must match the name on the OTP template registered with the gateway. */
function otpBrand(): string {
  return process.env.OTP_BRAND_NAME?.trim() || "SSGHS Alumni";
}

/** Returns the phone as 8801XXXXXXXXX, or throws when it is not a Bangladeshi mobile number. */
export function requireBdMobile(raw: unknown): string {
  const normalized = typeof raw === "string" ? normalizeBdPhoneNumber(raw) : null;
  if (!normalized || !isValidBdMobile(normalized)) {
    throw new AppError("INVALID_PHONE", 400, "Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
  }
  return normalized;
}

/** 8801711234567 → 01711234567, the form members know their number by. */
export function localBdPhone(normalized: string): string {
  return `0${normalized.slice(3)}`;
}

export async function requestPhoneOtp(
  rawPhone: unknown,
  now = Date.now(),
  opts: { exceptUserId?: string | null } = {}
): Promise<{ challenge: string; phone: string; expiresAt: number }> {
  const phone = requireBdMobile(rawPhone);
  // One number, one account: say so before spending an SMS.
  await requirePhoneFree(phone, { exceptUserId: opts.exceptUserId });
  const { isConfigured } = getBulkSmsConfig();
  // Without a gateway key the SMS client only simulates sending, so nobody could
  // ever receive the code. That is fine while developing, never in production.
  if (!isConfigured && process.env.NODE_ENV === "production") {
    throw smsOutage(now, new AppError("SMS_UNAVAILABLE", 503, "SMS verification is unavailable right now. Please verify by email instead."));
  }

  // Every SMS costs money and could be used to pester a stranger's phone: one code
  // per number per minute, and at most five an hour.
  if (!consumeRateLimit(`phone-otp-cooldown:${phone}`, { limit: 1, windowMs: OTP_RESEND_MS })) {
    throw new AppError("OTP_TOO_SOON", 429, "Please wait a minute before asking for another code.");
  }
  if (!consumeRateLimit(`phone-otp-hourly:${phone}`, { limit: 5, windowMs: 60 * 60_000 })) {
    throw new AppError("RATE_LIMITED", 429, "Too many codes sent to this number. Please try again in an hour.");
  }
  // A ceiling for the whole site, so rotating IPs and numbers ("SMS pumping")
  // cannot run up the gateway bill. Far above real sign-up traffic.
  if (!consumeRateLimit("phone-otp-site", { limit: OTP_SITE_HOURLY_LIMIT, windowMs: 60 * 60_000 })) {
    console.error("[phone-otp] Site-wide hourly OTP limit reached; possible SMS abuse.");
    throw smsOutage(now, new AppError("SMS_UNAVAILABLE", 503, "SMS verification is busy right now. Please verify by email instead."));
  }

  const code = newOtpCode();
  const sent = await sendBulkSms({
    numbers: [phone],
    // The gateway's approved OTP template; any other wording is rejected or delayed.
    message: `Your ${otpBrand()} OTP is ${code}`,
  });
  if (!sent.success) {
    console.error("[phone-otp] SMS send failed:", sent.responseCode, sent.error);
    throw smsOutage(now, new AppError("SMS_FAILED", 502, "We could not send the SMS right now. Please verify by email instead."));
  }
  resetSmsOutage();
  if (sent.isSimulated) console.info(`[phone-otp] Sandbox: verification code for ${phone} is ${code}`);

  const { challenge, expiresAt } = issueChallenge("phone", phone, code, now);
  return { challenge, phone: localBdPhone(phone), expiresAt };
}

export function verifyPhoneOtp(challengeToken: unknown, rawCode: unknown, now = Date.now()): { verificationToken: string; phone: string } {
  const phone = checkChallenge("phone", challengeToken, rawCode, now);
  return { verificationToken: issueVerified("phone", phone, now), phone: localBdPhone(phone) };
}

/** Returns the verified phone (01XXXXXXXXX) from a token issued by verifyPhoneOtp, or throws. */
export function readVerifiedPhone(token: unknown, now = Date.now()): string {
  const phone = readVerified("phone", token, now);
  if (!phone) throw new AppError("PHONE_NOT_VERIFIED", 400, "Please verify your phone number with the SMS code.");
  return localBdPhone(phone);
}
