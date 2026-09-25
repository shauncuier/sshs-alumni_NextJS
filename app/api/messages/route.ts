/**
 * SSGHS Alumni — Messages API with Real-Time Push
 * 
 * GET  /api/messages?userId=xxx              — Get conversations list
 * GET  /api/messages?userId=xxx&with=yyy     — Get message thread between two users
 * POST /api/messages                         — Send a message (pushes via SSE)
 * PATCH /api/messages                        — Mark messages as read
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendToUser, SSE_EVENTS, isUserOnline } from "@/lib/realtime";

/**
 * GET: Fetch conversations or specific thread
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const withUserId = searchParams.get("with");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

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

    // Fetch all conversations (latest message per conversation partner)
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
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
    const body = await req.json();
    const { senderId, receiverId, content } = body;

    if (!senderId || !receiverId || !content?.trim()) {
      return NextResponse.json(
        { error: "senderId, receiverId, and content are required" },
        { status: 400 }
      );
    }

    // Save to database
    let message;
    try {
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
      // Fallback for demo
      message = {
        id: `msg-${Date.now()}`,
        senderId,
        receiverId,
        content: content.trim(),
        isRead: false,
        createdAt: new Date(),
      };
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
    const body = await req.json();
    const { userId, senderId } = body;

    if (!userId || !senderId) {
      return NextResponse.json(
        { error: "userId and senderId are required" },
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
