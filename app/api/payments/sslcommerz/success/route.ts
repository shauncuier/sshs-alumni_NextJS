/**
 * SSGHS Alumni — SSLCommerz Success/Fail/Cancel/IPN Handlers
 * 
 * POST /api/payments/sslcommerz/success  — User redirect on successful payment
 * POST /api/payments/sslcommerz/fail     — User redirect on failed payment
 * POST /api/payments/sslcommerz/cancel   — User redirect on cancelled payment
 * 
 * SSLCommerz sends POST data with form-encoded fields.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateTransaction } from "@/lib/payments/sslcommerz";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    const valId = data.val_id;
    const tranId = data.tran_id;
    const donationId = data.value_a; // We passed donationId in value_a

    if (!valId) {
      return NextResponse.redirect(
        `${appUrl}/donate?payment=failed&reason=missing_validation_id`
      );
    }

    // Validate with SSLCommerz server
    const result = await validateTransaction(valId);

    if (result.verified && result.status === "COMPLETED") {
      // Update donation and transaction records
      try {
        if (donationId) {
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
                gatewayResponse: JSON.stringify(data),
              },
            });
          }

          // Update campaign
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
      } catch (dbErr) {
        console.error("[SSLCommerz Success] DB update error:", dbErr);
      }

      return NextResponse.redirect(
        `${appUrl}/donate?payment=success&trxId=${tranId}`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=validation_failed`
    );
  } catch (error) {
    console.error("[SSLCommerz Success] Error:", error);
    return NextResponse.redirect(
      `${appUrl}/donate?payment=failed&reason=server_error`
    );
  }
}
