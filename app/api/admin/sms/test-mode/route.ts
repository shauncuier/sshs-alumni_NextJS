import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getSmsTestMode, setSmsTestMode, TEST_MODE_HOURS } from "@/lib/sms-test-mode";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("sms", "Only administrators can change SMS settings.");

// GET /api/admin/sms/test-mode — whether verification codes are texted or shown on screen.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ ...(await getSmsTestMode()), hours: TEST_MODE_HOURS });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/sms/test-mode");
  }
}

// PUT /api/admin/sms/test-mode { on } — switch test mode on (for TEST_MODE_HOURS) or off.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { on?: unknown };
    if (typeof body?.on !== "boolean") throw new AppError("INVALID_INPUT", 400, "Say whether test mode is on or off.");
    const mode = await setSmsTestMode(body.on, me.email);
    // Test mode lets anyone join without a real SMS check: always on the record.
    await logActivity({
      category: "SECURITY",
      action: body.on ? "sms_test_mode.on" : "sms_test_mode.off",
      summary: body.on ? `SMS test mode on until ${mode.until}: codes shown on screen, not texted` : "SMS test mode off: codes are texted again",
      actor: me,
      targetType: "Setting",
      targetId: "sms-test-mode",
      req,
    });
    return NextResponse.json({ ...mode, hours: TEST_MODE_HOURS });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/sms/test-mode");
  }
}
