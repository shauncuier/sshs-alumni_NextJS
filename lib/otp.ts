import crypto from "crypto";
import { AppError } from "@/lib/app-error";
import { OTP_LENGTH } from "@/lib/phone-otp-format";
import { openJson, sealJson } from "@/lib/sealed-token";

/**
 * One-time-code verification shared by the SMS and email channels, without any
 * database table:
 *  1. issueChallenge seals (subject, code, expiry) into a token the browser holds.
 *  2. checkChallenge compares the typed code with the sealed one and, if right,
 *     issueVerified returns a sealed "verified" token for that subject.
 *  3. readVerified opens that token when the member registers.
 * Tokens are AES-256-GCM sealed with NEXTAUTH_SECRET (one key per purpose), so
 * the browser can neither read a code out of a challenge nor forge a token, and
 * a phone token can never pass as an email token.
 */

export type OtpChannel = "phone" | "email";

export const OTP_TTL_MS = 5 * 60_000;
export const VERIFIED_TTL_MS = 30 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 60_000;
/** An SMS costs money and can be slow to arrive: two minutes before another one. */
export const SMS_OTP_RESEND_MS = 2 * 60_000;

type Challenge = { id: string; subject: string; code: string; exp: number };
type Verified = { subject: string; exp: number };

const challengePurpose = (channel: OtpChannel) => `${channel}-otp-challenge`;
const verifiedPurpose = (channel: OtpChannel) => `${channel}-verified`;

// Wrong guesses per challenge. Kept in memory like the request rate limits; a
// challenge lives five minutes, so entries are pruned once they have expired.
const attempts = new Map<string, { count: number; exp: number }>();

function pruneAttempts(now: number) {
  if (attempts.size < 1_000) return;
  for (const [id, entry] of attempts) if (entry.exp <= now) attempts.delete(id);
}

export function newOtpCode(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function issueChallenge(channel: OtpChannel, subject: string, code: string, now = Date.now()): { challenge: string; expiresAt: number } {
  const exp = now + OTP_TTL_MS;
  const challenge = sealJson(challengePurpose(channel), { id: crypto.randomUUID(), subject, code, exp } satisfies Challenge);
  return { challenge, expiresAt: exp };
}

/** Returns the challenge's subject when `rawCode` is right; throws otherwise. */
export function checkChallenge(channel: OtpChannel, challengeToken: unknown, rawCode: unknown, now = Date.now()): string {
  const opened = typeof challengeToken === "string" ? openJson<Challenge>(challengePurpose(channel), challengeToken) : null;
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
  return challenge.subject;
}

export function issueVerified(channel: OtpChannel, subject: string, now = Date.now()): string {
  return sealJson(verifiedPurpose(channel), { subject, exp: now + VERIFIED_TTL_MS } satisfies Verified);
}

/** The verified subject in a token from issueVerified, or null when missing, forged or expired. */
export function readVerified(channel: OtpChannel, token: unknown, now = Date.now()): string | null {
  const opened = typeof token === "string" && token ? openJson<Verified>(verifiedPurpose(channel), token) : null;
  if (!opened?.ok || opened.value.exp <= now) return null;
  return opened.value.subject;
}
