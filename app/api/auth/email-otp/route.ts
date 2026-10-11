import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requestEmailOtp } from "@/lib/email-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Emails a one-time code: the fallback when the SMS code fails or never arrives.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "email-otp-send", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    return NextResponse.json(await requestEmailOtp(body.email));
  } catch (err) {
    return errorResponse(err, "POST /api/auth/email-otp");
  }
}
