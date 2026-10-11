import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { verifyPhoneOtp } from "@/lib/phone-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Checks the SMS code and answers with a short-lived "phone verified" token for registration.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "phone-otp-verify", { limit: 30, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    return NextResponse.json(verifyPhoneOtp(body.challenge, body.code));
  } catch (err) {
    return errorResponse(err, "POST /api/auth/phone-otp/verify");
  }
}
