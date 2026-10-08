/**
 * SSGHS Alumni — Notifications API with Real-Time SSE Push
 * 
 * GET   /api/notifications   — The signed-in member's notifications
 * POST  /api/notifications   — Create and push a notification for a member (admins only)
 * PATCH /api/notifications   — Mark the signed-in member's notifications as read
 *
 * The member is always the session user; a userId in GET/PATCH requests is ignored.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendToUser, SSE_EVENTS } from "@/lib/realtime";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { AppError } from "@/lib/app-error";
import { readJsonBody } from "@/lib/request-security";

/**
 * GET: Fetch notifications for a user
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = me.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter(
      (n: { isRead: boolean }) => !n.isRead
    ).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Notifications API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a notification and push via SSE
 */
export async function POST(req: NextRequest) {
  try {
    // Creating notifications for other members would let anyone send fake notices.
    const me = await getSessionUser();
    if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminRole(me.role)) {
      return NextResponse.json({ error: "Only administrators can send notifications." }, { status: 403 });
    }

    const body = await readJsonBody(req);
    const { userId, title, message, link, type } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "userId, title, and message are required" },
        { status: 400 }
      );
    }

    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          link: link || null,
          type: type || "CONNECTION",
          isRead: false,
        },
      });
    } catch (dbError) {
      console.error("[Notifications API] DB create error:", dbError);
      return NextResponse.json({ error: "Could not create the notification." }, { status: 503 });
    }

    // Push real-time notification via SSE
    sendToUser(userId, SSE_EVENTS.NEW_NOTIFICATION, {
      id: notification.id,
      title,
      message,
      link,
      type: type || "CONNECTION",
      createdAt: notification.createdAt,
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Notifications API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Mark notifications as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = me.id;

    const body = await readJsonBody(req);
    const { notificationIds } = body;

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      try {
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId,
          },
          data: { isRead: true },
        });
      } catch {
        // Non-critical
      }
    } else {
      // Mark all as read
      try {
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });
      } catch {
        // Non-critical
      }
    }

    // Push update to client
    sendToUser(userId, SSE_EVENTS.NOTIFICATION_READ, {
      readIds: notificationIds || "all",
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Notifications API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
