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

    // A valid signature only proves the pass was issued once. Admit the holder only
    // if the member account still exists and is verified now, so rejected, pending
    // or deleted accounts are refused even with a pass issued before the change.
    const deny = (securityStatus: string, error: string, status: number) =>
      NextResponse.json(
        { valid: false, securityStatus, error, alumnus, scannedAt: new Date().toISOString() },
        { status }
      );

    if (!payload.userId) {
      return deny("NO_MEMBER_ACCOUNT", "This pass is not linked to a member account.", 403);
    }

    let user: { status: string } | null;
    try {
      user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { status: true } });
    } catch (dbErr) {
      console.error("[Gate Verify] Member status lookup failed:", dbErr);
      // Fail closed, but do not call a genuine pass forged: the check could not run.
      return deny(
        "STATUS_CHECK_UNAVAILABLE",
        "Could not check membership status right now. Please try again or use the Help Desk.",
        503
      );
    }

    if (!user) {
      return deny("ACCOUNT_NOT_FOUND", `No member account exists for ${payload.fullName} any more.`, 403);
    }
    if (user.status === "PENDING") {
      return deny("UNDER_REVIEW", `Membership for ${payload.fullName} is still pending verification.`, 403);
    }
    if (user.status !== "VERIFIED") {
      return deny("MEMBERSHIP_REJECTED", `Membership for ${payload.fullName} has been rejected.`, 403);
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
    console.error("[Gate Verify API Error]", error);
    return NextResponse.json(
      { valid: false, error: "Internal gate verification system error" },
      { status: 500 }
    );
  }
}
