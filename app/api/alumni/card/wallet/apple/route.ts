/**
 * SSGHS Alumni — Apple Wallet Pass API
 * GET /api/alumni/card/wallet/apple?token=xxx
 * 
 * Generates an Apple Wallet pass definition for iOS Passbook / Wallet.
 */

import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/request-origin";
import { verifyCardToken, buildAppleWalletPassManifest } from "@/lib/id-card";
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

  const passManifest = buildAppleWalletPassManifest(payload, verifyUrl);

  // In production with an Apple Developer Team certificate, this JSON
  // would be zipped with icons, manifest.json, and signature into a .pkpass file.
  // Here we serve the compliant Apple Passbook schema with correct headers.
  return new NextResponse(JSON.stringify(passManifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass+json",
      "Content-Disposition": `attachment; filename="SSGHS-Pass-${payload.alumniId}.json"`,
    },
  });
}
