import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requestEmailOtp } from "@/lib/email-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Emails a one-time code: the fallback when the SMS code fails or never arrives.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "email-otp-send", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const result = await requestEmailOtp(body.email);
    await logActivity({ category: "VERIFY", action: "email_code.sent", summary: `Email code sent to ${result.email}`, actor: { email: result.email }, targetType: "email", targetId: result.email, req });
    return NextResponse.json(result);
  } catch (err) {
    await logActivity({ category: "VERIFY", action: "email_code.send_failed", status: "FAILURE", summary: `Email code not sent: ${err instanceof Error ? err.message : "error"}`, metadata: { errorCode: (err as { code?: string }).code }, req });
    return errorResponse(err, "POST /api/auth/email-otp");
  }
}
