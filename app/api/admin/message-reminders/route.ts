import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getMessageReminderSetting, setMessageReminderSetting } from "@/lib/message-reminders-setting";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("sms", "Only administrators can change SMS settings.");

// GET /api/admin/message-reminders: whether members get an email / SMS about unread messages.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getMessageReminderSetting());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/message-reminders");
  }
}

// PUT /api/admin/message-reminders { sms, email }: switch the reminders on or off for everyone.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { sms?: unknown; email?: unknown };
    if (typeof body?.sms !== "boolean" || typeof body?.email !== "boolean") {
      throw new AppError("INVALID_INPUT", 400, "Say whether the reminder SMS and email are on or off.");
    }
    const before = await getMessageReminderSetting();
    const after = await setMessageReminderSetting({ sms: body.sms, email: body.email }, me.email);
    const onOff = (v: boolean) => (v ? "on" : "off");
    await logActivity({
      category: "SMS",
      action: "message_reminders.updated",
      summary: `Unread-message reminder SMS ${onOff(after.sms)}, email ${onOff(after.email)}`,
      actor: me,
      targetType: "Setting",
      targetId: "message-reminders",
      metadata: { sms: { from: before.sms, to: after.sms }, email: { from: before.email, to: after.email } },
      req,
    });
    return NextResponse.json(after);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/message-reminders");
  }
}
