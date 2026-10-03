/**
 * SSGHS Alumni — Web Push Notification Subscription API
 * POST /api/push/subscribe
 * 
 * Stores browser push notification endpoints for urgent school & reunion notices.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";

// In-memory or Redis/DB store of push subscriptions
interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
  subscribedAt: string;
}

const pushSubscriptions: PushSubscriptionRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    const body = await req.json();
    const { subscription } = body;

    if (!subscription || typeof subscription.endpoint !== "string" || !subscription.keys || typeof subscription.keys.p256dh !== "string" || typeof subscription.keys.auth !== "string") {
      return NextResponse.json(
        { error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    let endpoint: URL;
    try {
      endpoint = new URL(subscription.endpoint);
    } catch {
      return NextResponse.json({ error: "Invalid push subscription endpoint" }, { status: 400 });
    }
    if (endpoint.protocol !== "https:") return NextResponse.json({ error: "Invalid push subscription endpoint" }, { status: 400 });

    const record: PushSubscriptionRecord = {
      endpoint: endpoint.href,
      keys: subscription.keys,
      userId: session.id,
      subscribedAt: new Date().toISOString(),
    };

    // Remove existing if duplicate
    const index = pushSubscriptions.findIndex(
      (s) => s.endpoint === endpoint.href
    );
    if (index >= 0) {
      pushSubscriptions[index] = record;
    } else {
      pushSubscriptions.push(record);
    }

    return NextResponse.json({
      success: true,
      message: "Push notification subscription registered successfully.",
      totalSubscriptions: pushSubscriptions.length,
    });
  } catch (error: unknown) {
    console.error("[Push Subscribe API Error]", error);
    return NextResponse.json(
      { error: "Failed to save push subscription", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BNo-SampleVapidKey-SSGHS-Alumni-2026",
  });
}
