/**
 * SSGHS Alumni — Payment Initiation API
 * POST /api/payments/initiate
 * 
 * Creates a donation record and initiates payment with the selected gateway.
 * Returns a gateway URL for user redirect (bKash/Nagad/SSLCommerz)
 * or a confirmation for manual/bank transfers.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { initiatePayment, resolveGateway } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      campaignId,
      amount,
      donorName,
      donorEmail,
      donorPhone,
      donorBatch,
      paymentMethod,
      isAnonymous,
      userId,
    } = body;

    // ── Validation ─────────────────────────────────────────────────
    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount. Must be greater than 0 BDT." },
        { status: 400 }
      );
    }

    if (!donorName) {
      return NextResponse.json(
        { error: "Donor name is required" },
        { status: 400 }
      );
    }

    // ── Resolve Gateway ────────────────────────────────────────────
    const gateway = resolveGateway(paymentMethod || "bKash");
    const receiptId = `SSGHS-DON-${Date.now().toString().slice(-8)}`;

    // ── Create Donation Record (INITIATED status) ──────────────────
    let donation;
    try {
      donation = await prisma.donation.create({
        data: {
          campaignId,
          userId: userId || undefined,
          donorName: isAnonymous ? "Anonymous Alumnus" : donorName,
          donorEmail,
          donorPhone,
          donorBatch: donorBatch ? parseInt(String(donorBatch)) : undefined,
          amount: parseFloat(String(amount)),
          paymentMethod: paymentMethod || "bKash",
          paymentGateway: gateway,
          paymentStatus: "INITIATED",
          isAnonymous: isAnonymous || false,
          receiptId,
        },
      });
    } catch (dbError) {
      console.error("[Payment] Database create error:", dbError);
      // Fallback: proceed without DB record for demo/testing
      donation = {
        id: `temp-${Date.now()}`,
        receiptId,
      };
    }

    // ── Initiate Payment with Gateway ──────────────────────────────
    const result = await initiatePayment({
      donationId: donation.id,
      campaignId,
      amount: parseFloat(String(amount)),
      donorName,
      donorEmail,
      donorPhone,
      donorBatch: donorBatch ? parseInt(String(donorBatch)) : undefined,
      paymentGateway: gateway,
      isAnonymous,
    });

    if (!result.success) {
      // Update donation status to FAILED
      try {
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            paymentStatus: "FAILED",
            failureReason: result.error,
          },
        });
      } catch {
        // Ignore DB update failure in fallback mode
      }

      return NextResponse.json(
        {
          error: result.error || "Payment initiation failed",
          errorCode: result.errorCode,
        },
        { status: 502 }
      );
    }

    // ── Create PaymentTransaction audit record ─────────────────────
    try {
      await prisma.paymentTransaction.create({
        data: {
          donationId: donation.id,
          gateway,
          gatewaySessionKey: result.paymentId,
          amount: parseFloat(String(amount)),
          currency: "BDT",
          status: "INITIATED",
          merchantInvoice: result.merchantInvoice,
        },
      });
    } catch {
      // Non-critical — payment can proceed without audit record
      console.warn("[Payment] Could not create transaction audit record");
    }

    // ── Update donation with transaction ref ───────────────────────
    try {
      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          transactionRef: result.transactionRef,
          paymentStatus: "PENDING",
        },
      });
    } catch {
      // Ignore in fallback mode
    }

    return NextResponse.json(
      {
        success: true,
        donationId: donation.id,
        receiptId,
        gatewayUrl: result.gatewayUrl,
        paymentId: result.paymentId,
        transactionRef: result.transactionRef,
        gateway,
        message: result.gatewayUrl
          ? "Redirect to payment gateway to complete donation"
          : "Donation recorded. Please complete bank transfer manually.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Payment] Initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error during payment initiation" },
      { status: 500 }
    );
  }
}
