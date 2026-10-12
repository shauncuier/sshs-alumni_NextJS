/**
 * SSGHS Alumni — SSLCommerz Fail Handler
 * POST /api/payments/sslcommerz/fail
 */

import { NextRequest, NextResponse } from "next/server";
// Gateway callbacks come from SSLCommerz, not this site, so there is no same-origin
// check; the form is still capped (a real callback is a few KB).
import { readLimitedFormData } from "@/lib/request-security";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const form = await readLimitedFormData(req, 64 * 1024).catch(() => null);
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
