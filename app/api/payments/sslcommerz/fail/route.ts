/**
 * SSGHS Alumni — SSLCommerz Fail Handler
 * POST /api/payments/sslcommerz/fail
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
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
