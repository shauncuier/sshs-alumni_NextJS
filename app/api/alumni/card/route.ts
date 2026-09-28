/**
 * SSGHS Alumni — Digital Smart ID Card Generation API
 * GET /api/alumni/card?alumniId=xxx
 * 
 * Generates cryptographic pass data and QR code for the member.
 */

import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/request-origin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  generateAlumniId,
  createCardToken,
  generateQrDataUrl,
  CardPayload,
} from "@/lib/id-card";

interface AlumnusCardData {
  id: string;
  alumniId: string;
  fullName: string;
  sscBatch: number;
  profession: string;
  bloodGroup?: string;
  membershipTier: CardPayload["membershipTier"];
  avatarUrl: string;
  status: string;
}

const DEFAULT_AVATAR_URL =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Sign in to view your digital card." }, { status: 401 });
    }

    // Only ever issue a card for the signed-in member; never fall back to sample data.
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { profile: true },
      });
    } catch (dbErr) {
      console.error("[Card API] Member lookup failed:", dbErr);
      return NextResponse.json({ error: "Could not load your digital card right now." }, { status: 503 });
    }
    if (!user) {
      return NextResponse.json({ error: "Member account not found." }, { status: 404 });
    }

    const sscBatch = user.profile?.sscBatch || 2008;
    const alumnusData: AlumnusCardData = {
      id: user.id,
      alumniId: generateAlumniId(sscBatch, user.id),
      fullName: user.profile?.fullName || "SSGHS Alumnus",
      sscBatch,
      profession: user.profile?.profession || "Professional",
      // Blood group is not collected yet; leave it off the card rather than guess.
      membershipTier: "LIFETIME",
      avatarUrl: user.profile?.avatarUrl || DEFAULT_AVATAR_URL,
      status: user.status,
    };

    // Sign payload
    const tokenPayload: Omit<CardPayload, "eiin"> = {
      alumniId: alumnusData.alumniId,
      userId: alumnusData.id,
      fullName: alumnusData.fullName,
      sscBatch: alumnusData.sscBatch,
      profession: alumnusData.profession,
      bloodGroup: alumnusData.bloodGroup,
      membershipTier: alumnusData.membershipTier,
      issuedAt: Date.now(),
      // 5-year digital pass validity
      expiresAt: Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
    };

    const signedToken = createCardToken(tokenPayload);

    // Build gate verification URL
    const verifyUrl = `${publicOrigin(req)}/verify/${signedToken}`;

    // Generate high-res QR code
    const qrDataUrl = await generateQrDataUrl(verifyUrl);

    return NextResponse.json({
      success: true,
      card: {
        ...tokenPayload,
        eiin: "105070",
        institution: "Sabuj Shikshayatan Government High School, Chattogram",
        avatarUrl: alumnusData.avatarUrl,
        status: alumnusData.status,
      },
      signedToken,
      verifyUrl,
      qrDataUrl,
      appleWalletUrl: `/api/alumni/card/wallet/apple?token=${signedToken}`,
      googleWalletUrl: `/api/alumni/card/wallet/google?token=${signedToken}`,
    });
  } catch (error: unknown) {
    console.error("[Card API Error]", error);
    return NextResponse.json(
      { error: "Failed to generate alumni digital card", details: (error as Error).message },
      { status: 500 }
    );
  }
}
