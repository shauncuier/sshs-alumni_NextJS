/**
 * SSGHS Alumni — Notifications API with Real-Time SSE Push
 * 
 * GET   /api/notifications?userId=xxx         — Get user's notifications
 * POST  /api/notifications                    — Create and push a notification
 * PATCH /api/notifications                    — Mark notifications as read
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendToUser, SSE_EVENTS } from "@/lib/realtime";

/**
 * GET: Fetch notifications for a user
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

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
    const body = await req.json();
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
      notification = {
        id: `notif-${Date.now()}`,
        userId,
        title,
        message,
        link,
        type: type || "CONNECTION",
        isRead: false,
        createdAt: new Date(),
      };
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
    const body = await req.json();
    const { userId, notificationIds } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

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
    console.error("[Notifications API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
