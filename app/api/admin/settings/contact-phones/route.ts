import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getContactPhonesSetting, setContactPhones } from "@/lib/contact-phones";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("settings", "Only administrators can change the contact numbers.");

// GET /api/admin/settings/contact-phones — the association's contact numbers, as saved.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getContactPhonesSetting());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/settings/contact-phones");
  }
}

// PUT /api/admin/settings/contact-phones { phones: [{ number, name }] } — replace the list.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { phones?: unknown };
    const setting = await setContactPhones(body?.phones, me.email);
    await logActivity({
      category: "ADMIN",
      action: "contact_phones.update",
      summary: `Contact numbers changed: ${setting.phones.map((p) => (p.name ? `${p.name} ${p.number}` : p.number)).join(", ")}`,
      actor: me,
      targetType: "Setting",
      targetId: "contact-phones",
      req,
    });
    return NextResponse.json(setting);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/settings/contact-phones");
  }
}
