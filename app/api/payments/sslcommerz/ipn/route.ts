/**
 * SSGHS Alumni — SSLCommerz IPN (Instant Payment Notification) Handler
 * POST /api/payments/sslcommerz/ipn
 * 
 * Server-to-server webhook from SSLCommerz confirming payment.
 * This is the most reliable confirmation method.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateTransaction, validateIPNHash } from "@/lib/payments/sslcommerz";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    // Validate IPN hash for authenticity
    const isAuthentic = validateIPNHash(data);
    if (!isAuthentic) {
      console.error("[SSLCommerz IPN] Hash validation failed — possible tampering");
      return NextResponse.json(
        { error: "IPN hash validation failed" },
        { status: 403 }
      );
    }

    const valId = data.val_id;
    const tranId = data.tran_id;
    const donationId = data.value_a;
    const status = data.status; // VALID, FAILED, CANCELLED

    if (!valId || !tranId) {
      return NextResponse.json(
        { error: "Missing val_id or tran_id" },
        { status: 400 }
      );
    }

    // Double-verify with SSLCommerz validation API
    const validation = await validateTransaction(valId);

    if (validation.verified && validation.status === "COMPLETED") {
      try {
        if (donationId) {
          // Check if already marked complete (idempotent)
          const existing = await prisma.donation.findUnique({
            where: { id: donationId },
            select: { paymentStatus: true },
          });

          if (existing && existing.paymentStatus !== "COMPLETED") {
            await prisma.donation.update({
              where: { id: donationId },
              data: {
                paymentStatus: "COMPLETED",
                gatewayTrxId: tranId,
                paidAt: new Date(),
                ipnPayload: JSON.stringify(data),
              },
            });

            const tx = await prisma.paymentTransaction.findUnique({
              where: { donationId },
            });
            if (tx) {
              await prisma.paymentTransaction.update({
                where: { id: tx.id },
                data: {
                  status: "COMPLETED",
                  gatewayTrxId: tranId,
                  completedAt: new Date(),
                  callbackPayload: JSON.stringify(data),
                },
              });
            }

            // Update campaign totals
            const donation = await prisma.donation.findUnique({
              where: { id: donationId },
            });
            if (donation) {
              await prisma.donationCampaign.update({
                where: { id: donation.campaignId },
                data: {
                  raisedAmount: { increment: donation.amount },
                  donorCount: { increment: 1 },
                },
              });
            }
          }
        }
      } catch (dbErr) {
        console.error("[SSLCommerz IPN] DB update error:", dbErr);
      }
    } else if (status === "FAILED") {
      try {
        if (donationId) {
          await prisma.donation.update({
            where: { id: donationId },
            data: {
              paymentStatus: "FAILED",
              failureReason: "SSLCommerz IPN reported failure",
            },
          });
        }
      } catch {
        // non-critical
      }
    }

    // Always respond 200 to SSLCommerz to acknowledge receipt
    return NextResponse.json({ status: "received" }, { status: 200 });
  } catch (error) {
    console.error("[SSLCommerz IPN] Error:", error);
    return NextResponse.json({ error: "IPN processing error" }, { status: 500 });
  }
}
