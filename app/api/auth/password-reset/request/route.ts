import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requestPasswordResetCode } from "@/lib/password-reset";
import { clientAddress, readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { requireTurnstile } from "@/lib/turnstile";

// POST /api/auth/password-reset/request — texts a reset code to the number on an account.
// The code is then checked by POST /api/auth/phone-otp/verify, as everywhere else.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "password-reset-request", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    await requireTurnstile(body.turnstileToken, "password_reset", clientAddress(req));
    const { userId, ...result } = await requestPasswordResetCode(body.phone);
    await logActivity({
      category: "SECURITY",
      action: "password.reset_code_sent",
      summary: `Password reset code sent to ${result.phone}`,
      targetType: "User",
      targetId: userId,
      req,
    });
    return NextResponse.json(result);
  } catch (err) {
    await logActivity({
      category: "SECURITY",
      action: "password.reset_code_failed",
      status: "FAILURE",
      summary: `Password reset code not sent: ${err instanceof Error ? err.message : "error"}`,
      metadata: { errorCode: (err as { code?: string }).code },
      req,
    });
    return errorResponse(err, "POST /api/auth/password-reset/request");
  }
}
