import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { verifyEmailOtp } from "@/lib/email-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Checks the emailed code and answers with a short-lived "email verified" token for registration.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "email-otp-verify", { limit: 30, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const result = verifyEmailOtp(body.challenge, body.code);
    await logActivity({ category: "VERIFY", action: "email.verified", summary: `Email ${result.email} verified`, actor: { email: result.email }, targetType: "email", targetId: result.email, req });
    return NextResponse.json(result);
  } catch (err) {
    await logFailure(err, { category: "VERIFY", action: "email.verify_failed", req });
    return errorResponse(err, "POST /api/auth/email-otp/verify");
  }
}
