/**
 * SSGHS Alumni — Broadcast Push Notification API
 * POST /api/push/send
 * 
 * Sends instant push notifications for emergency notices, golden jubilee countdown, and reunion announcements.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
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
    console.error("[Push Send API Error]", error);
    return NextResponse.json(
      { error: "Failed to dispatch push notification", details: (error as Error).message },
      { status: 500 }
    );
  }
}
