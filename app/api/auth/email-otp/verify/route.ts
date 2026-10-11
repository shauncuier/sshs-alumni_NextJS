import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { verifyEmailOtp } from "@/lib/email-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Checks the emailed code and answers with a short-lived "email verified" token for registration.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "email-otp-verify", { limit: 30, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    return NextResponse.json(verifyEmailOtp(body.challenge, body.code));
  } catch (err) {
    return errorResponse(err, "POST /api/auth/email-otp/verify");
  }
}
