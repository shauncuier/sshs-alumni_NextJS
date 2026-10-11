import { issueVerified, VERIFIED_TTL_MS } from "@/lib/otp";

/** A "phone verified" token as POST /api/auth/phone-otp/verify issues it. */
export function verifiedPhoneToken(phone = "8801711000111", exp = Date.now() + VERIFIED_TTL_MS): string {
  return issueVerified("phone", phone, exp - VERIFIED_TTL_MS);
}

/** An "email verified" token as POST /api/auth/email-otp/verify issues it. */
export function verifiedEmailToken(email: string, exp = Date.now() + VERIFIED_TTL_MS): string {
  return issueVerified("email", email, exp - VERIFIED_TTL_MS);
}
