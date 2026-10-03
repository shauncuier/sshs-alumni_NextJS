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
import { validateTransaction } from "@/lib/payments/sslcommerz";
import { finalizeDonationPayment } from "@/lib/payments/finalize";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = String(value);
    });

    const valId = data.val_id;
    if (!valId) {
      return NextResponse.redirect(
        `${appUrl}/donate?payment=failed&reason=missing_validation_id`
      );
    }

    // Validate with SSLCommerz server
    const result = await validateTransaction(valId);

    if (result.verified && result.status === "COMPLETED" && result.donationId && result.merchantInvoice && result.amount && result.currency === "BDT") {
      const finalized = await finalizeDonationPayment({
        donationId: result.donationId,
        gateway: "SSLCOMMERZ",
        merchantInvoice: result.merchantInvoice,
        gatewayTrxId: result.gatewayTrxId,
        amount: result.amount,
        payload: JSON.stringify(data),
      });
      if (finalized.ok) {
      return NextResponse.redirect(
          `${appUrl}/donate?payment=success&trxId=${encodeURIComponent(result.gatewayTrxId || "")}`
      );
      }
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
