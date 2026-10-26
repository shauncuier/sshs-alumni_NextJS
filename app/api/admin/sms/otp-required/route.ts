import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getOtpSetting, setOtpRequired } from "@/lib/otp-setting";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("sms", "Only administrators can change SMS settings.");

// GET /api/admin/sms/otp-required — whether joining members must verify their number with a code.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getOtpSetting());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/sms/otp-required");
  }
}

// PUT /api/admin/sms/otp-required { required } — switch number verification codes on or off.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { required?: unknown };
    if (typeof body?.required !== "boolean") throw new AppError("INVALID_INPUT", 400, "Say whether codes are required or not.");
    const setting = await setOtpRequired(body.required, me.email);
    // With codes off, nobody's number is checked: always on the record.
    await logActivity({
      category: "SECURITY",
      action: body.required ? "otp_required.on" : "otp_required.off",
      summary: body.required ? "Verification codes required again for new members and number changes" : "Verification codes switched off: numbers are accepted as typed",
      actor: me,
      targetType: "Setting",
      targetId: "otp-required",
      req,
    });
    return NextResponse.json(setting);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/sms/otp-required");
  }
}
