/**
 * SSGHS Alumni — SSLCommerz Fail Handler
 * POST /api/payments/sslcommerz/fail
 */

import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const form = await req.formData().catch(() => null);
    const tranId = form?.get("tran_id")?.toString() ?? null;
    await logActivity({ category: "PAYMENT", action: "payment.failed", status: "FAILURE", summary: `SSLCommerz payment failed${tranId ? ` (${tranId})` : ""}`, targetType: "PaymentTransaction", targetId: tranId, metadata: { gateway: "SSLCOMMERZ" }, req });
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
