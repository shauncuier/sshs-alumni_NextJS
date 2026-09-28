/**
 * SSGHS Alumni — Digital Smart ID Card Generation API
 * GET /api/alumni/card?alumniId=xxx
 * 
 * Generates cryptographic pass data and QR code for the member.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  generateAlumniId,
  createCardToken,
  generateQrDataUrl,
  CardPayload,
} from "@/lib/id-card";
import { sampleAlumni } from "@/lib/data";

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
    const searchParams = req.nextUrl.searchParams;
    const requestedAlumniId = searchParams.get("alumniId");

    // Fetch user or fallback to demo alumnus
    let alumnusData: AlumnusCardData | null = null;

    if (session?.user?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          include: { profile: true },
        });

        if (user) {
          const sscBatch = user.profile?.sscBatch || 2008;
          alumnusData = {
            id: user.id,
            alumniId: generateAlumniId(sscBatch),
            fullName: user.profile?.fullName || "SSGHS Alumnus",
            sscBatch,
            profession: user.profile?.profession || "Professional",
            // Blood group is not collected yet; leave it off the card rather than guess.
            membershipTier: "LIFETIME",
            avatarUrl: user.profile?.avatarUrl || DEFAULT_AVATAR_URL,
            status: user.status,
          };
        }
      } catch (dbErr) {
        console.warn("[Card API] DB fetch failed, using fallback", dbErr);
      }
    }

    if (!alumnusData) {
      // Find from sample data or default
      const matched = requestedAlumniId
        ? sampleAlumni.find((a) => a.id === requestedAlumniId)
        : sampleAlumni[0];

      const found = matched || sampleAlumni[0];
      alumnusData = {
        id: found.id,
        alumniId: generateAlumniId(found.sscBatch),
        fullName: found.fullName,
        sscBatch: found.sscBatch,
        profession: found.profession,
        bloodGroup: "B+",
        membershipTier: "LIFETIME",
        avatarUrl: found.avatarUrl,
        status: "VERIFIED",
      };
    }

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
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const verifyUrl = `${protocol}://${host}/verify/${signedToken}`;

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
