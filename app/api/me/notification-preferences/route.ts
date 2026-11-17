import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { errorResponse } from "@/lib/api-response";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

/**
 * The signed-in member's own reminder preferences (Settings → Notifications): an email
 * and/or an SMS when a direct message is still unread after an hour (lib/message-reminders.ts).
 */
async function read(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { messageEmailReminders: true, messageSmsReminders: true, profile: { select: { phone: true, phoneVerifiedAt: true } } },
  });
  if (!user) throw new AppError("NOT_FOUND", 404, "Account not found.");
  return {
    messageEmailReminders: user.messageEmailReminders,
    messageSmsReminders: user.messageSmsReminders,
    hasPhone: Boolean(user.profile?.phone),
    phoneVerified: Boolean(user.profile?.phoneVerifiedAt),
  };
}

// GET /api/me/notification-preferences
export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    return NextResponse.json(await read(me.id));
  } catch (err) {
    return errorResponse(err, "GET /api/me/notification-preferences");
  }
}

// PUT /api/me/notification-preferences { messageEmailReminders?, messageSmsReminders? }
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "notification-preferences", { limit: 30, windowMs: 60 * 60_000 });
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const body = (await readJsonBody(req)) as { messageEmailReminders?: unknown; messageSmsReminders?: unknown };
    const data: { messageEmailReminders?: boolean; messageSmsReminders?: boolean } = {};
    for (const key of ["messageEmailReminders", "messageSmsReminders"] as const) {
      if (body?.[key] === undefined) continue;
      if (typeof body[key] !== "boolean") throw new AppError("INVALID_INPUT", 400, "Say whether each reminder is on or off.");
      data[key] = body[key] as boolean;
    }
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: me.id }, data });
      const onOff = (v: boolean | undefined) => (v === undefined ? null : v ? "on" : "off");
      await logActivity({
        category: "ACCOUNT",
        action: "notification_preferences.updated",
        summary: `Unread-message reminders: ${[data.messageEmailReminders !== undefined && `email ${onOff(data.messageEmailReminders)}`, data.messageSmsReminders !== undefined && `SMS ${onOff(data.messageSmsReminders)}`].filter(Boolean).join(", ")}`,
        actor: me,
        targetType: "User",
        targetId: me.id,
        metadata: data,
        req,
      });
    }
    return NextResponse.json(await read(me.id));
  } catch (err) {
    return errorResponse(err, "PUT /api/me/notification-preferences");
  }
}
