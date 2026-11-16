import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { resetPasswordWithPhone } from "@/lib/password-reset";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// POST /api/auth/password-reset — { verificationToken (from phone-otp/verify), newPassword }.
// Sets the new password and signs the account out everywhere.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "password-reset", { limit: 10, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    const { userId, email } = await resetPasswordWithPhone(body.verificationToken, body.newPassword);
    await logActivity({
      category: "SECURITY",
      action: "password.reset",
      summary: `${email} reset their password with an SMS code`,
      actor: { id: userId, email },
      targetType: "User",
      targetId: userId,
      req,
    });
    return NextResponse.json({ email });
  } catch (err) {
    await logActivity({
      category: "SECURITY",
      action: "password.reset_failed",
      status: "FAILURE",
      summary: `Password reset failed: ${err instanceof Error ? err.message : "error"}`,
      metadata: { errorCode: (err as { code?: string }).code },
      req,
    });
    return errorResponse(err, "POST /api/auth/password-reset");
  }
}
