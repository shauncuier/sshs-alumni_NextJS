/**
 * SSGHS Alumni — SSLCommerz Cancel Handler
 * POST /api/payments/sslcommerz/cancel
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const formData = await req.formData();
    const donationId = String(formData.get("value_a") || "");

    if (donationId) {
      try {
        await prisma.donation.update({
          where: { id: donationId },
          data: { paymentStatus: "CANCELLED" },
        });
        const tx = await prisma.paymentTransaction.findUnique({
          where: { donationId },
        });
        if (tx) {
          await prisma.paymentTransaction.update({
            where: { id: tx.id },
            data: { status: "CANCELLED" },
          });
        }
      } catch (dbErr) {
        console.error("[SSLCommerz Cancel] DB update error:", dbErr);
      }
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=cancelled`
    );
  } catch (error) {
    console.error("[SSLCommerz Cancel] Error:", error);
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=server_error`
    );
  }
}
