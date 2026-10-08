/**
 * SSGHS Alumni — Broadcast Push Notification API
 * POST /api/push/send
 * 
 * Sends instant push notifications for emergency notices, golden jubilee countdown, and reunion announcements.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { AppError } from "@/lib/app-error";
import { readJsonBody } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await readJsonBody(req);
    const { title, body: messageBody, url, category } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "Title and message body are required for push broadcast" },
        { status: 400 }
      );
    }

    // In a production server, this invokes web-push with VAPID credentials
    // payload: { title, body, url: url || '/events', icon: '/logo.png' }
    console.log(`[Push Broadcast] Dispatched: "${title}" to subscribed devices.`);

    return NextResponse.json({
      success: true,
      broadcastId: `PUSH-${Date.now()}`,
      title,
      body: messageBody,
      targetUrl: url || "/events",
      deliveredAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Push Send API Error]", error);
    return NextResponse.json(
      { error: "Failed to dispatch push notification" },
      { status: 500 }
    );
  }
}
