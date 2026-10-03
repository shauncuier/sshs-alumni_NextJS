/**
 * SSGHS Alumni — Messages API with Real-Time Push
 * 
 * GET  /api/messages                — Conversations of the signed-in member
 * GET  /api/messages?with=yyy        — Thread between the signed-in member and yyy
 * POST /api/messages                 — Send a message as the signed-in member (pushes via SSE)
 * PATCH /api/messages                — Mark messages from a sender as read
 *
 * The member is always the session user; any userId/senderId in the request is ignored.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendToUser, SSE_EVENTS, isUserOnline } from "@/lib/realtime";
import { getSessionUser } from "@/lib/session-user";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";

/**
 * GET: Fetch conversations or specific thread
 */
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = me.id;
  const withUserId = req.nextUrl.searchParams.get("with");

  try {
    if (withUserId) {
      // Fetch specific thread between two users
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: withUserId },
            { senderId: withUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      return NextResponse.json({ messages });
    }

    // Fetch conversations (bounded to latest 200 messages per direction to prevent query exhaustion)
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Build conversation list with latest message per partner
    const conversationMap = new Map<
      string,
      { partnerId: string; lastMessage: string; lastTime: Date; unreadCount: number }
    >();

    for (const msg of [...sentMessages, ...receivedMessages]) {
      const partnerId =
        msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          unreadCount: 0,
        });
      }
    }

    // Count unread messages per conversation
    for (const msg of receivedMessages) {
      if (!msg.isRead) {
        const entry = conversationMap.get(msg.senderId);
        if (entry) {
          entry.unreadCount++;
        }
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => b.lastTime.getTime() - a.lastTime.getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[Messages API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST: Send a message and push real-time notification
 */
export async function POST(req: NextRequest) {
  try {
    requireRateLimit(req, "send-message", { limit: 30, windowMs: 60_000 });

    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const senderId = me.id;

    const body = await req.json();
    const { receiverId, content } = body;

    if (!receiverId || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "receiverId and content are required" },
        { status: 400 }
      );
    }

    if (receiverId === senderId) {
      return NextResponse.json(
        { error: "Cannot send messages to yourself" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Message content cannot exceed 5000 characters" },
        { status: 400 }
      );
    }

    // Save to database; never report a message as sent unless it was stored.
    let message;
    try {
      const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
      if (!receiver) {
        return NextResponse.json({ error: "That member could not be found." }, { status: 404 });
      }
      message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content: content.trim(),
          isRead: false,
        },
      });
    } catch (dbError) {
      console.error("[Messages API] DB create error:", dbError);
      return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 503 });
    }

    // ── Push real-time notification to receiver ──────────────────────
    const isOnline = isUserOnline(receiverId);

    sendToUser(receiverId, SSE_EVENTS.NEW_MESSAGE, {
      messageId: message.id,
      senderId,
      content: content.trim(),
      createdAt: message.createdAt,
    });

    // Also create a notification record if receiver is offline
    if (!isOnline) {
      try {
        await prisma.notification.create({
          data: {
            userId: receiverId,
            title: "New Message",
            message: `You have a new message`,
            link: `/messages`,
            type: "CONNECTION",
            isRead: false,
          },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json(
      {
        message,
        delivered: isOnline,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[Messages API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Mark messages as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = me.id;

    const body = await req.json();
    const { senderId } = body;

    if (!senderId) {
      return NextResponse.json(
        { error: "senderId is required" },
        { status: 400 }
      );
    }

    try {
      await prisma.message.updateMany({
        where: {
          senderId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch {
      // Non-critical
    }

    // Notify sender that messages have been read
    sendToUser(senderId, SSE_EVENTS.MESSAGE_READ, {
      readBy: userId,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Messages API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
