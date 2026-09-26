/**
 * SSGHS Alumni — Gate & Reunion QR Code Verification API
 * POST /api/alumni/card/verify
 * 
 * Verifies a digital smart card token scanned at school gate or reunion desk.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCardToken } from "@/lib/id-card";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, gateId, scannedBy } = body;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Verification token or QR payload is required" },
        { status: 400 }
      );
    }

    // Verify cryptographic token
    const result = verifyCardToken(token);

    if (!result.valid || !result.payload) {
      return NextResponse.json(
        {
          valid: false,
          error: result.error || "Cryptographic verification failed. Invalid or forged QR code.",
          scannedAt: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const { payload } = result;

    // Optional check in DB if userId exists
    let dbStatus = "VERIFIED";
    if (payload.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { status: true, role: true },
        });
        if (user) {
          dbStatus = user.status;
        }
      } catch {
        // Fallback gracefully in case DB record not found in demo
      }
    }

    const isAuthorized = dbStatus === "VERIFIED" || dbStatus === "ACTIVE";

    return NextResponse.json({
      valid: isAuthorized,
      securityStatus: isAuthorized ? "AUTHORIZED_ALUMNUS" : "UNDER_REVIEW",
      alumnus: {
        alumniId: payload.alumniId,
        fullName: payload.fullName,
        sscBatch: payload.sscBatch,
        membershipTier: payload.membershipTier,
        bloodGroup: payload.bloodGroup,
        profession: payload.profession,
        eiin: payload.eiin,
        issuedAt: new Date(payload.issuedAt).toISOString(),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : "LIFETIME",
      },
      gateCheckin: {
        gateId: gateId || "MAIN_CAMPUS_GATE_1",
        verifiedAt: new Date().toISOString(),
        scannedBy: scannedBy || "Gate Volunteer Officer",
      },
    });
  } catch (error: any) {
    console.error("[Gate Verify API Error]", error);
    return NextResponse.json(
      { valid: false, error: "Internal gate verification system error" },
      { status: 500 }
    );
  }
}
