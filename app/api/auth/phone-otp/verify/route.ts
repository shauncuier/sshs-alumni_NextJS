import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { verifyPhoneOtp } from "@/lib/phone-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Checks the SMS code and answers with a short-lived "phone verified" token for registration.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "phone-otp-verify", { limit: 60, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const result = verifyPhoneOtp(body.challenge, body.code);
    await logActivity({ category: "VERIFY", action: "phone.verified", summary: `Phone ${result.phone} verified`, targetType: "phone", targetId: result.phone, req });
    return NextResponse.json(result);
  } catch (err) {
    await logFailure(err, { category: "VERIFY", action: "phone.verify_failed", req });
    return errorResponse(err, "POST /api/auth/phone-otp/verify");
  }
}
