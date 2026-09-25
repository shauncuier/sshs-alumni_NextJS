/**
 * SSGHS Alumni — Nagad Payment Callback Handler
 * GET /api/payments/nagad/callback
 * 
 * Nagad redirects user here after payment. Verifies and updates records.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPayment } from "@/lib/payments/nagad";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const paymentRefId = searchParams.get("payment_ref_id") || searchParams.get("paymentRefId");
  const status = searchParams.get("status");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!paymentRefId) {
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=missing_ref`
    );
  }

  if (status === "Aborted" || status === "Cancel") {
    try {
      const tx = await prisma.paymentTransaction.findFirst({
        where: { gatewaySessionKey: paymentRefId },
      });
      if (tx) {
        await prisma.donation.update({
          where: { id: tx.donationId },
          data: { paymentStatus: "CANCELLED" },
        });
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: { status: "CANCELLED" },
        });
      }
    } catch (err) {
      console.error("[Nagad Callback] Cancel DB error:", err);
    }
    return NextResponse.redirect(`${appUrl}/donate?payment=failed&reason=cancelled`);
  }

  try {
    const result = await verifyPayment(paymentRefId);

    const tx = await prisma.paymentTransaction.findFirst({
      where: { gatewaySessionKey: paymentRefId },
    }).catch(() => null);

    if (result.verified && result.status === "COMPLETED") {
      try {
        if (tx) {
          await prisma.paymentTransaction.update({
            where: { id: tx.id },
            data: {
              status: "COMPLETED",
              gatewayTrxId: result.gatewayTrxId,
              completedAt: new Date(),
              gatewayResponse: JSON.stringify(result),
            },
          });
          await prisma.donation.update({
            where: { id: tx.donationId },
            data: {
              paymentStatus: "COMPLETED",
              gatewayTrxId: result.gatewayTrxId,
              paidAt: new Date(),
            },
          });
          // Update campaign
          const donation = await prisma.donation.findUnique({
            where: { id: tx.donationId },
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
      } catch (dbErr) {
        console.error("[Nagad Callback] DB success update error:", dbErr);
      }
      return NextResponse.redirect(
        `${appUrl}/donate?payment=success&trxId=${result.gatewayTrxId}`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=verification_failed`
    );
  } catch (error) {
    console.error("[Nagad Callback] Error:", error);
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=server_error`
    );
  }
}
