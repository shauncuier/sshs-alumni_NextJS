import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { DEFAULT_REGISTRATION_SMS, getRegistrationSmsText, setRegistrationSmsText } from "@/lib/sms-text";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("payments", "Only administrators can change the confirmation SMS.");

// GET /api/admin/sms-text — the wording of the "registration confirmed" SMS, and the default.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ ...(await getRegistrationSmsText()), defaultText: DEFAULT_REGISTRATION_SMS });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/sms-text");
  }
}

// PUT /api/admin/sms-text { text } — change the wording; null or "" goes back to the default.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { text?: unknown };
    const before = await getRegistrationSmsText();
    const after = await setRegistrationSmsText(body?.text ?? null, me.email);
    await logActivity({
      category: "SMS",
      action: "sms_text.updated",
      summary: after.isDefault ? "Registration confirmation SMS reset to the default text" : `Registration confirmation SMS changed to: "${after.text}"`,
      actor: me,
      targetType: "Setting",
      targetId: "sms-text-registration-confirmed",
      metadata: { from: before.text, to: after.text },
      req,
    });
    return NextResponse.json({ ...after, defaultText: DEFAULT_REGISTRATION_SMS });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/sms-text");
  }
}
