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
import { finalizeDonationPayment } from "@/lib/payments/finalize";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const paymentID = searchParams.get("paymentID");
  const status = searchParams.get("status");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // If user cancelled
  if (status === "cancel" || status === "failure") {
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

    if (result.verified && result.status === "COMPLETED") {
      const tx = await prisma.paymentTransaction.findFirst({
        where: { gateway: "BKASH", gatewaySessionKey: paymentID },
        select: { donationId: true },
      });
      if (tx && result.amount !== undefined) {
        const finalized = await finalizeDonationPayment({
          donationId: tx.donationId,
          gateway: "BKASH",
          gatewaySessionKey: paymentID,
          gatewayTrxId: result.gatewayTrxId,
          amount: result.amount,
          payload: JSON.stringify(result),
        });
        if (finalized.ok) {
          const receiptId = (await prisma.donation.findUnique({ where: { id: tx.donationId }, select: { receiptId: true } }))?.receiptId || "";
          return NextResponse.redirect(
            `${appUrl}/donate?payment=success&trxId=${encodeURIComponent(result.gatewayTrxId || "")}&receipt=${encodeURIComponent(receiptId)}`
          );
        }
      }
    }

    // Payment not verified — query to double check
    const queryResult = await queryPayment(paymentID);
    if (queryResult.verified && queryResult.amount !== undefined) {
      const tx = await prisma.paymentTransaction.findFirst({
        where: { gateway: "BKASH", gatewaySessionKey: paymentID },
        select: { donationId: true },
      });
      if (tx) {
        const finalized = await finalizeDonationPayment({
          donationId: tx.donationId,
          gateway: "BKASH",
          gatewaySessionKey: paymentID,
          gatewayTrxId: queryResult.gatewayTrxId,
          amount: queryResult.amount,
          payload: JSON.stringify(queryResult),
        });
        if (!finalized.ok) {
          return NextResponse.redirect(
            `${appUrl}/donate?payment=failed&reason=verification_failed`
          );
        }
      } else {
        return NextResponse.redirect(
          `${appUrl}/donate?payment=failed&reason=verification_failed`
        );
      }
      return NextResponse.redirect(
        `${appUrl}/donate?payment=success&trxId=${encodeURIComponent(queryResult.gatewayTrxId || "")}`
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
