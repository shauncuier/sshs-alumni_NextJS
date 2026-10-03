/**
 * SSGHS Alumni — SSLCommerz Cancel Handler
 * POST /api/payments/sslcommerz/cancel
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
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
