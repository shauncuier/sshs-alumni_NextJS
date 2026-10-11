import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requestPhoneOtp } from "@/lib/phone-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// Texts a one-time code to the phone a new member is registering with.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "phone-otp-send", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const result = await requestPhoneOtp(body.phone);
    await logActivity({ category: "VERIFY", action: "phone_code.sent", summary: `SMS code sent to ${result.phone}`, targetType: "phone", targetId: result.phone, req });
    return NextResponse.json(result);
  } catch (err) {
    await logActivity({ category: "VERIFY", action: "phone_code.send_failed", status: "FAILURE", summary: `SMS code not sent: ${err instanceof Error ? err.message : "error"}`, metadata: { errorCode: (err as { code?: string }).code }, req });
    return errorResponse(err, "POST /api/auth/phone-otp");
  }
}
