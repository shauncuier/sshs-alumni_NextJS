import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requestPhoneOtp } from "@/lib/phone-otp";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// Texts a one-time code to the phone a new member is registering with.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    // Per address (shared by many on mobile data); each number also has its own limit.
    requireRateLimit(req, "phone-otp-send", { limit: 30, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    // Signed in (changing the number on the profile): their own number is not "taken".
    const me = await getSessionUser().catch(() => null);
    const result = await requestPhoneOtp(body.phone, Date.now(), { exceptUserId: me?.id });
    await logActivity({
      category: "VERIFY",
      action: result.testCode ? "phone_code.test_mode" : "phone_code.sent",
      summary: result.testCode ? `Test mode: code for ${result.phone} shown on screen, no SMS` : `SMS code sent to ${result.phone}`,
      targetType: "phone",
      targetId: result.phone,
      req,
    });
    return NextResponse.json(result);
  } catch (err) {
    await logActivity({ category: "VERIFY", action: "phone_code.send_failed", status: "FAILURE", summary: `SMS code not sent: ${err instanceof Error ? err.message : "error"}`, metadata: { errorCode: (err as { code?: string }).code }, req });
    return errorResponse(err, "POST /api/auth/phone-otp");
  }
}
