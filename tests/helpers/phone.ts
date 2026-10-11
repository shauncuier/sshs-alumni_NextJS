import { sealJson } from "@/lib/sealed-token";
import { VERIFIED_TTL_MS } from "@/lib/phone-otp";

/** A "phone verified" token as POST /api/auth/phone-otp/verify issues it. */
export function verifiedPhoneToken(phone = "8801711000111", exp = Date.now() + VERIFIED_TTL_MS): string {
  return sealJson("phone-verified", { phone, exp });
}
