/**
 * SSGHS Alumni — Nagad Payment Callback Handler
 * GET /api/payments/nagad/callback
 * 
 * Nagad redirects user here after payment. Verifies and updates records.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPayment } from "@/lib/payments/nagad";
import { finalizeDonationPayment } from "@/lib/payments/finalize";

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
    return NextResponse.redirect(`${appUrl}/donate?payment=failed&reason=cancelled`);
  }

  try {
    const result = await verifyPayment(paymentRefId);

    if (result.verified && result.status === "COMPLETED") {
      const tx = await prisma.paymentTransaction.findFirst({
        where: { gateway: "NAGAD", gatewaySessionKey: paymentRefId },
        select: { donationId: true },
      });
      if (tx && result.amount !== undefined) {
        const finalized = await finalizeDonationPayment({
          donationId: tx.donationId,
          gateway: "NAGAD",
          gatewaySessionKey: paymentRefId,
          gatewayTrxId: result.gatewayTrxId,
          amount: result.amount,
          payload: JSON.stringify(result),
        });
        if (finalized.ok) {
          return NextResponse.redirect(
            `${appUrl}/donate?payment=success&trxId=${encodeURIComponent(result.gatewayTrxId || "")}`
          );
        }
      }
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
