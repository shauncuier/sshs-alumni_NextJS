/**
 * GET /api/alumni/card — the signed-in member's membership card: the details printed
 * on it and a freshly signed gate QR code (see lib/member-card.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/request-origin";
import { getMemberSession } from "@/lib/session-user";
import prisma from "@/lib/prisma";
import { buildMemberCard } from "@/lib/member-card";

export async function GET(req: NextRequest) {
  try {
    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Sign in to view your membership card." }, { status: 401 });
    }

    // Only ever issue a card for the signed-in member; never fall back to sample data.
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, status: true, profile: { select: { fullName: true, sscBatch: true, profession: true, avatarUrl: true, bloodGroup: true } } },
      });
    } catch (dbErr) {
      console.error("[Card API] Member lookup failed:", dbErr);
      return NextResponse.json({ error: "Could not load your membership card right now." }, { status: 503 });
    }
    if (!user) {
      return NextResponse.json({ error: "Member account not found." }, { status: 404 });
    }

    const origin = publicOrigin(req);
    const card = await buildMemberCard(user, origin);
    if (!card) {
      return NextResponse.json({ error: "Complete your alumni profile before getting a membership card." }, { status: 409 });
    }
    return NextResponse.json({ success: true, card, origin });
  } catch (error: unknown) {
    console.error("[Card API Error]", error);
    return NextResponse.json({ error: "Failed to generate your membership card" }, { status: 500 });
  }
}
