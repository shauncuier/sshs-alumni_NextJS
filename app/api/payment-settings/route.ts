import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getPaymentSettings, paymentLines } from "@/lib/payment-settings";

export const dynamic = "force-dynamic";

// GET /api/payment-settings — where to send money: the public payment details only.
export async function GET() {
  try {
    const s = await getPaymentSettings();
    return NextResponse.json({
      lines: paymentLines(s),
      bkashNumber: s.bkashNumber || null,
      nagadNumber: s.nagadNumber || null,
      banglaQrImage: s.banglaQrImage || null,
      banglaQrMerchant: s.banglaQrMerchant || null,
    });
  } catch (err) {
    return errorResponse(err, "GET /api/payment-settings");
  }
}
