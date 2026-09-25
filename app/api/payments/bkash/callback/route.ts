/**
 * SSGHS Alumni — bKash Payment Callback Handler
 * GET /api/payments/bkash/callback
 * 
 * bKash redirects user here after payment completion.
 * We execute the payment and redirect to success/failure page.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { executePayment, queryPayment } from "@/lib/payments/bkash";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const paymentID = searchParams.get("paymentID");
  const status = searchParams.get("status");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If user cancelled
  if (status === "cancel" || status === "failure") {
    // Update donation status
    try {
      const tx = await prisma.paymentTransaction.findFirst({
        where: { gatewaySessionKey: paymentID },
      });
      if (tx) {
        await prisma.donation.update({
          where: { id: tx.donationId },
          data: {
            paymentStatus: status === "cancel" ? "CANCELLED" : "FAILED",
            failureReason: `bKash ${status}`,
          },
        });
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: status === "cancel" ? "CANCELLED" : "FAILED",
            errorMessage: `User ${status} on bKash checkout`,
          },
        });
      }
    } catch (err) {
      console.error("[bKash Callback] DB update error:", err);
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=${status}`
    );
  }

  // Execute payment
  if (!paymentID) {
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=missing_payment_id`
    );
  }

  try {
    const result = await executePayment(paymentID);

    // Find the transaction record
    let tx;
    try {
      tx = await prisma.paymentTransaction.findFirst({
        where: { gatewaySessionKey: paymentID },
      });
    } catch {
      // Fallback mode
    }

    if (result.verified && result.status === "COMPLETED") {
      // Update records on success
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

          // Update campaign raised amount
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
        console.error("[bKash Callback] DB success update error:", dbErr);
      }

      const receiptId = tx
        ? (
            await prisma.donation.findUnique({
              where: { id: tx.donationId },
              select: { receiptId: true },
            })
          )?.receiptId
        : "";

      return NextResponse.redirect(
        `${appUrl}/donate?payment=success&trxId=${result.gatewayTrxId}&receipt=${receiptId || ""}`
      );
    }

    // Payment not verified — query to double check
    const queryResult = await queryPayment(paymentID);
    if (queryResult.verified) {
      return NextResponse.redirect(
        `${appUrl}/donate?payment=success&trxId=${queryResult.gatewayTrxId}`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=execution_failed`
    );
  } catch (error) {
    console.error("[bKash Callback] Error:", error);
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=server_error`
    );
  }
}
