/**
 * SSGHS Alumni — SSLCommerz Cancel Handler
 * POST /api/payments/sslcommerz/cancel
 */

import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

export async function POST(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const form = await req.formData().catch(() => null);
    const tranId = form?.get("tran_id")?.toString() ?? null;
    await logActivity({ category: "PAYMENT", action: "payment.cancelled", status: "FAILURE", summary: `SSLCommerz payment cancelled${tranId ? ` (${tranId})` : ""}`, targetType: "PaymentTransaction", targetId: tranId, metadata: { gateway: "SSLCOMMERZ" }, req });
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
