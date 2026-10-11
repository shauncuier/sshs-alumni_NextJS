import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { getEmailProvider, sendEmail } from "@/lib/email";
import { checkChallenge, issueChallenge, issueVerified, newOtpCode, OTP_RESEND_MS, OTP_TTL_MS, readVerified } from "@/lib/otp";
import { consumeRateLimit } from "@/lib/request-security";

/**
 * Email verification by one-time code: the fallback when a member's SMS code
 * fails or never arrives (see lib/otp.ts for the token flow). Registration
 * accepts an email token instead of a phone token, and only for the address
 * that was verified.
 */

export const EMAIL_OTP_SITE_HOURLY_LIMIT = 300;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function brand(): string {
  return process.env.OTP_BRAND_NAME?.trim() || "SSGHS Alumni";
}

export function normalizeEmail(raw: unknown): string {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new AppError("INVALID_EMAIL", 400, "Please enter a valid email address first.");
  }
  return email;
}

export async function requestEmailOtp(rawEmail: unknown, now = Date.now()): Promise<{ challenge: string; email: string; expiresAt: number }> {
  const email = normalizeEmail(rawEmail);
  // Without Resend or SMTP the code is only printed to the server log. Fine while
  // developing, never in production.
  if (getEmailProvider() === "console" && process.env.NODE_ENV === "production") {
    throw new AppError("EMAIL_UNAVAILABLE", 503, "Email verification is unavailable right now. Please try again later.");
  }
  // Joining always creates a new account; say so now rather than after the whole form.
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new AppError("EMAIL_EXISTS", 409, "You already have an account with this email — sign in instead.");
  }
  if (!consumeRateLimit(`email-otp-cooldown:${email}`, { limit: 1, windowMs: OTP_RESEND_MS })) {
    throw new AppError("OTP_TOO_SOON", 429, "Please wait a minute before asking for another code.");
  }
  if (!consumeRateLimit(`email-otp-hourly:${email}`, { limit: 5, windowMs: 60 * 60_000 })) {
    throw new AppError("RATE_LIMITED", 429, "Too many codes sent to this email. Please try again later.");
  }
  if (!consumeRateLimit("email-otp-site", { limit: EMAIL_OTP_SITE_HOURLY_LIMIT, windowMs: 60 * 60_000 })) {
    console.error("[email-otp] Site-wide hourly limit reached; possible abuse.");
    throw new AppError("EMAIL_UNAVAILABLE", 503, "Email verification is busy right now. Please try again in a little while.");
  }

  const code = newOtpCode();
  const minutes = OTP_TTL_MS / 60_000;
  const sent = await sendEmail({
    to: email,
    subject: `Your ${brand()} verification code: ${code}`,
    text: `Your ${brand()} verification code is ${code}. It expires in ${minutes} minutes. If you did not ask for it, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f172a">
  <h2 style="color:#064e3b;margin:0 0 12px">${brand()}</h2>
  <p>Your verification code is:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0;color:#064e3b">${code}</p>
  <p style="color:#475569;font-size:13px">It expires in ${minutes} minutes. If you did not ask for this code, you can ignore this email.</p>
</div>`,
  });
  if (!sent.success) {
    console.error("[email-otp] Email send failed:", sent.error);
    throw new AppError("EMAIL_FAILED", 502, "We could not send the email. Please check the address and try again.");
  }

  const { challenge, expiresAt } = issueChallenge("email", email, code, now);
  return { challenge, email, expiresAt };
}

export function verifyEmailOtp(challengeToken: unknown, rawCode: unknown, now = Date.now()): { verificationToken: string; email: string } {
  const email = checkChallenge("email", challengeToken, rawCode, now);
  return { verificationToken: issueVerified("email", email, now), email };
}

/** The verified email from a token issued by verifyEmailOtp, or null. */
export function readVerifiedEmail(token: unknown, now = Date.now()): string | null {
  return readVerified("email", token, now);
}
