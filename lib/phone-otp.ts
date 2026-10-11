import crypto from "crypto";
import { AppError } from "@/lib/app-error";
import { getBulkSmsConfig, isValidBdMobile, normalizeBdPhoneNumber, sendBulkSms } from "@/lib/bulksmsbd";
import { OTP_LENGTH } from "@/lib/phone-otp-format";
import { consumeRateLimit } from "@/lib/request-security";
import { openJson, sealJson } from "@/lib/sealed-token";

/**
 * Phone verification by SMS one-time code, without any database table:
 *  1. requestPhoneOtp texts a 4-digit code and returns a sealed challenge
 *     (phone, code, expiry), which the browser holds on to.
 *  2. verifyPhoneOtp checks the code against the challenge and returns a sealed
 *     "phone verified" token.
 *  3. Registration calls readVerifiedPhone on that token, so the account's phone
 *     number is always one the member proved they can receive SMS on.
 * Tokens are AES-256-GCM sealed with NEXTAUTH_SECRET, so the browser can neither
 * read the code out of a challenge nor forge a verified token.
 */

export const OTP_TTL_MS = 5 * 60_000;
export const VERIFIED_TTL_MS = 30 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 60_000;

/** The brand in the SMS; must match the name on the OTP template registered with the gateway. */
function otpBrand(): string {
  return process.env.OTP_BRAND_NAME?.trim() || "SSGHS Alumni";
}

const CHALLENGE_PURPOSE = "phone-otp-challenge";
const VERIFIED_PURPOSE = "phone-verified";

type Challenge = { id: string; phone: string; code: string; exp: number };
type Verified = { phone: string; exp: number };

// Wrong guesses per challenge. Kept in memory like the request rate limits; a
// challenge lives five minutes, so entries are pruned once they have expired.
const attempts = new Map<string, { count: number; exp: number }>();

function pruneAttempts(now: number) {
  if (attempts.size < 1_000) return;
  for (const [id, entry] of attempts) if (entry.exp <= now) attempts.delete(id);
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

export async function requestPhoneOtp(rawPhone: unknown, now = Date.now()): Promise<{ challenge: string; phone: string; expiresAt: number }> {
  const phone = requireBdMobile(rawPhone);
  const { isConfigured } = getBulkSmsConfig();
  // Without a gateway key the SMS client only simulates sending, so nobody could
  // ever receive the code. That is fine while developing, never in production.
  if (!isConfigured && process.env.NODE_ENV === "production") {
    throw new AppError("SMS_UNAVAILABLE", 503, "Phone verification is unavailable right now. Please try again later.");
  }

  // Every SMS costs money and could be used to pester a stranger's phone: one code
  // per number per minute, and at most five an hour.
  if (!consumeRateLimit(`phone-otp-cooldown:${phone}`, { limit: 1, windowMs: OTP_RESEND_MS })) {
    throw new AppError("OTP_TOO_SOON", 429, "Please wait a minute before asking for another code.");
  }
  if (!consumeRateLimit(`phone-otp-hourly:${phone}`, { limit: 5, windowMs: 60 * 60_000 })) {
    throw new AppError("RATE_LIMITED", 429, "Too many codes sent to this number. Please try again later.");
  }

  const code = crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  const exp = now + OTP_TTL_MS;
  const sent = await sendBulkSms({
    numbers: [phone],
    // The gateway's approved OTP template; any other wording is rejected or delayed.
    message: `Your ${otpBrand()} OTP is ${code}`,
  });
  if (!sent.success) {
    console.error("[phone-otp] SMS send failed:", sent.responseCode, sent.error);
    throw new AppError("SMS_FAILED", 502, "We could not send the code. Please check the number and try again.");
  }
  if (sent.isSimulated) console.info(`[phone-otp] Sandbox: verification code for ${phone} is ${code}`);

  const challenge = sealJson(CHALLENGE_PURPOSE, { id: crypto.randomUUID(), phone, code, exp } satisfies Challenge);
  return { challenge, phone: localBdPhone(phone), expiresAt: exp };
}

export function verifyPhoneOtp(challengeToken: unknown, rawCode: unknown, now = Date.now()): { verificationToken: string; phone: string } {
  const opened = typeof challengeToken === "string" ? openJson<Challenge>(CHALLENGE_PURPOSE, challengeToken) : null;
  if (!opened?.ok) throw new AppError("OTP_INVALID", 400, "Please request a new code.");
  const challenge = opened.value;
  if (challenge.exp <= now) throw new AppError("OTP_EXPIRED", 400, "The code has expired. Please request a new one.");

  pruneAttempts(now);
  const tries = attempts.get(challenge.id) ?? { count: 0, exp: challenge.exp };
  if (tries.count >= OTP_MAX_ATTEMPTS) {
    throw new AppError("OTP_LOCKED", 429, "Too many wrong codes. Please request a new one.");
  }

  const code = typeof rawCode === "string" ? rawCode.replace(/\s+/g, "") : "";
  const matches = code.length === challenge.code.length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(challenge.code));
  if (!matches) {
    attempts.set(challenge.id, { count: tries.count + 1, exp: challenge.exp });
    const left = OTP_MAX_ATTEMPTS - tries.count - 1;
    throw left > 0
      ? new AppError("OTP_WRONG", 400, `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`)
      : new AppError("OTP_LOCKED", 429, "Too many wrong codes. Please request a new one.");
  }

  attempts.delete(challenge.id);
  const verificationToken = sealJson(VERIFIED_PURPOSE, { phone: challenge.phone, exp: now + VERIFIED_TTL_MS } satisfies Verified);
  return { verificationToken, phone: localBdPhone(challenge.phone) };
}

/** Returns the verified phone (01XXXXXXXXX) from a token issued by verifyPhoneOtp, or throws. */
export function readVerifiedPhone(token: unknown, now = Date.now()): string {
  const opened = typeof token === "string" && token ? openJson<Verified>(VERIFIED_PURPOSE, token) : null;
  if (!opened?.ok || opened.value.exp <= now) {
    throw new AppError("PHONE_NOT_VERIFIED", 400, "Please verify your phone number with the SMS code.");
  }
  return localBdPhone(opened.value.phone);
}
