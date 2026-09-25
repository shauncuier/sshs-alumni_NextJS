/**
 * SSGHS Alumni — SSLCommerz Fail Handler
 * POST /api/payments/sslcommerz/fail
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const formData = await req.formData();
    const donationId = String(formData.get("value_a") || "");
    const failedReason = String(formData.get("error") || "Payment failed");

    if (donationId) {
      try {
        await prisma.donation.update({
          where: { id: donationId },
          data: {
            paymentStatus: "FAILED",
            failureReason: failedReason,
          },
        });
        const tx = await prisma.paymentTransaction.findUnique({
          where: { donationId },
        });
        if (tx) {
          await prisma.paymentTransaction.update({
            where: { id: tx.id },
            data: {
              status: "FAILED",
              errorMessage: failedReason,
            },
          });
        }
      } catch (dbErr) {
        console.error("[SSLCommerz Fail] DB update error:", dbErr);
      }
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=payment_failed`
    );
  } catch (error) {
    console.error("[SSLCommerz Fail] Error:", error);
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=server_error`
    );
  }
}
