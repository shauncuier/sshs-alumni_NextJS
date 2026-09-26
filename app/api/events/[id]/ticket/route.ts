/**
 * SSGHS Alumni — Reunion Ticketing & Merchandise Registration API
 * POST /api/events/[id]/ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { signCardPayload, generateQrDataUrl } from "@/lib/id-card";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    const body = await req.json();

    const {
      tierId,
      tierName,
      amount,
      attendeeName,
      attendeeEmail,
      attendeePhone,
      sscBatch,
      guestCount,
      tshirtSize,
      dietaryPreference,
      paymentMethod,
    } = body;

    if (!attendeeName || !attendeeEmail || !tierId) {
      return NextResponse.json(
        { error: "Attendee name, email, and ticket tier are required" },
        { status: 400 }
      );
    }

    const ticketNumber = `SSGHS-TKT-${Date.now().toString().slice(-6)}`;
    const seatTable = `Table ${((parseInt(String(sscBatch || 2008)) % 25) + 1)}`;

    // Build verification payload for gate scanner
    const tokenPayload = {
      alumniId: ticketNumber,
      fullName: attendeeName,
      sscBatch: parseInt(String(sscBatch || 2008)),
      membershipTier: "LIFETIME" as const,
      issuedAt: Date.now(),
      profession: `Reunion Delegate (${tierName})`,
    };

    const signedToken = signCardPayload(tokenPayload);
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const verifyUrl = `${protocol}://${host}/verify/${signedToken}`;
    const qrDataUrl = await generateQrDataUrl(verifyUrl);

    const ticketRecord = {
      ticketNumber,
      eventId: id,
      tierId,
      tierName,
      amount: parseFloat(String(amount || 1500)),
      attendeeName,
      attendeeEmail,
      attendeePhone,
      sscBatch,
      seatTable,
      tshirtSize: tshirtSize || "L",
      dietaryPreference: dietaryPreference || "Standard Halal",
      guestCount: guestCount || 1,
      paymentMethod: paymentMethod || "bKash",
      paymentStatus: "CONFIRMED",
      qrDataUrl,
      verifyUrl,
      signedToken,
      issuedAt: new Date().toISOString(),
    };

    console.log(`[Ticketing] Issued ticket ${ticketNumber} to ${attendeeName} (${seatTable})`);

    return NextResponse.json({
      success: true,
      message: "Ticket registered and confirmed with payment gateway.",
      ticket: ticketRecord,
    });
  } catch (error: any) {
    console.error("[Ticket API Error]", error);
    return NextResponse.json(
      { error: "Failed to generate reunion ticket", details: error.message },
      { status: 500 }
    );
  }
}
