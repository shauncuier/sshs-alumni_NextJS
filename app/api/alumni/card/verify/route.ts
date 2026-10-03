/**
 * SSGHS Alumni — Gate & Reunion QR Code Verification API
 * POST /api/alumni/card/verify
 * 
 * Verifies a digital smart card token scanned at school gate or reunion desk.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCardToken } from "@/lib/id-card";
import { checkCardMembership } from "@/lib/card-membership";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";

export async function POST(req: NextRequest) {
  try {
    requireRateLimit(req, "card-verify", { limit: 60, windowMs: 60_000 });

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

    const alumnus = {
      alumniId: payload.alumniId,
      fullName: payload.fullName,
      sscBatch: payload.sscBatch,
      membershipTier: payload.membershipTier,
      bloodGroup: payload.bloodGroup,
      profession: payload.profession,
      eiin: payload.eiin,
      issuedAt: new Date(payload.issuedAt).toISOString(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : "LIFETIME",
    };

    const membership = await checkCardMembership(payload);
    if (!membership.ok) {
      return NextResponse.json(
        {
          valid: false,
          securityStatus: membership.securityStatus,
          error: membership.error,
          alumnus,
          scannedAt: new Date().toISOString(),
        },
        { status: membership.httpStatus }
      );
    }

    return NextResponse.json({
      valid: true,
      securityStatus: "AUTHORIZED_ALUMNUS",
      alumnus,
      gateCheckin: {
        gateId: gateId || "MAIN_CAMPUS_GATE_1",
        verifiedAt: new Date().toISOString(),
        scannedBy: scannedBy || "Gate Volunteer Officer",
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ valid: false, error: error.message }, { status: error.status });
    }
    console.error("[Gate Verify API Error]", error);
    return NextResponse.json(
      { valid: false, error: "Internal gate verification system error" },
      { status: 500 }
    );
  }
}
