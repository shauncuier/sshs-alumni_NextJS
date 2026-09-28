/**
 * SSGHS Alumni — Google Wallet Pass API
 * GET /api/alumni/card/wallet/google?token=xxx
 * 
 * Generates Google Wallet save pass payload.
 */

import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/request-origin";
import { verifyCardToken, buildGoogleWalletPassPayload } from "@/lib/id-card";
import { checkCardMembership } from "@/lib/card-membership";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Card token is required" }, { status: 400 });
  }

  const { valid, payload, error } = verifyCardToken(token);

  if (!valid || !payload) {
    return NextResponse.json({ error: error || "Invalid card token" }, { status: 403 });
  }

  // Only issue a wallet pass to a member who is verified now; the gate refuses the rest.
  const membership = await checkCardMembership(payload);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error, securityStatus: membership.securityStatus },
      { status: membership.httpStatus }
    );
  }

  const verifyUrl = `${publicOrigin(req)}/verify/${token}`;

  const googleWalletPayload = buildGoogleWalletPassPayload(payload, verifyUrl);

  return NextResponse.json({
    success: true,
    platform: "Google Wallet",
    payload: googleWalletPayload,
    saveUrl: `https://pay.google.com/gp/v/save/${encodeURIComponent(payload.alumniId)}`,
    help: "Add this pass to Google Wallet on Android devices for NFC/QR display at school reunions.",
  });
}
