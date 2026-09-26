/**
 * SSGHS Alumni — Web Push Notification Subscription API
 * POST /api/push/subscribe
 * 
 * Stores browser push notification endpoints for urgent school & reunion notices.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// In-memory or Redis/DB store of push subscriptions
interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  subscribedAt: string;
}

const pushSubscriptions: PushSubscriptionRecord[] = [];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await req.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid push subscription object" },
        { status: 400 }
      );
    }

    const record: PushSubscriptionRecord = {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      userId: userId || (session?.user as any)?.id || "anonymous",
      subscribedAt: new Date().toISOString(),
    };

    // Remove existing if duplicate
    const index = pushSubscriptions.findIndex(
      (s) => s.endpoint === subscription.endpoint
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
  } catch (error: any) {
    console.error("[Push Subscribe API Error]", error);
    return NextResponse.json(
      { error: "Failed to save push subscription", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    totalSubscriptions: pushSubscriptions.length,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BNo-SampleVapidKey-SSGHS-Alumni-2026",
  });
}
