import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getRegistrationAlertSetting, setRegistrationAlertEmails } from "@/lib/registration-alerts";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("settings", "Only administrators can change who gets registration alerts.");

// GET /api/admin/settings/registration-alerts — who is emailed about new registrations.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getRegistrationAlertSetting());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/settings/registration-alerts");
  }
}

// PUT /api/admin/settings/registration-alerts { emails: string[] } — replace the list; empty turns alerts off.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { emails?: unknown };
    const setting = await setRegistrationAlertEmails(body?.emails, me.email);
    await logActivity({
      category: "ADMIN",
      action: "registration_alerts.update",
      summary: setting.emails.length ? `Registration alerts go to: ${setting.emails.join(", ")}` : "Registration alerts turned off",
      actor: me,
      targetType: "Setting",
      targetId: "registration-alert-emails",
      req,
    });
    return NextResponse.json(setting);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/settings/registration-alerts");
  }
}
