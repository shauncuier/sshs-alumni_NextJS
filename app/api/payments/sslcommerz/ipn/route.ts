/**
 * SSGHS Alumni — SSLCommerz IPN (Instant Payment Notification) Handler
 * POST /api/payments/sslcommerz/ipn
 * 
 * Server-to-server webhook from SSLCommerz confirming payment.
 * This is the most reliable confirmation method.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateTransaction, validateIPNHash } from "@/lib/payments/sslcommerz";
import { finalizeDonationPayment } from "@/lib/payments/finalize";

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
    if (!valId) {
      return NextResponse.json(
        { error: "Missing val_id" },
        { status: 400 }
      );
    }

    // Double-verify with SSLCommerz validation API
    const validation = await validateTransaction(valId);

    if (validation.verified && validation.status === "COMPLETED" && validation.donationId && validation.merchantInvoice && validation.amount && validation.currency === "BDT") {
      try {
        await finalizeDonationPayment({
          donationId: validation.donationId,
          gateway: "SSLCOMMERZ",
          merchantInvoice: validation.merchantInvoice,
          gatewayTrxId: validation.gatewayTrxId,
          amount: validation.amount,
          payload: JSON.stringify(data),
        });
      } catch (dbErr) {
        console.error("[SSLCommerz IPN] DB update error:", dbErr);
      }
    }

    // Always respond 200 to SSLCommerz to acknowledge receipt
    return NextResponse.json({ status: "received" }, { status: 200 });
  } catch (error) {
    console.error("[SSLCommerz IPN] Error:", error);
    return NextResponse.json({ error: "IPN processing error" }, { status: 500 });
  }
}
