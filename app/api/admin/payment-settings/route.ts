import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { BKASH_ACCOUNT_TYPES, getPaymentSettings, updatePaymentSettings } from "@/lib/payment-settings";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("payments", "Only administrators can change payment details.");

// GET /api/admin/payment-settings — the current payment details, for editing.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ settings: await getPaymentSettings(), accountTypes: BKASH_ACCOUNT_TYPES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/payment-settings");
  }
}

// PUT /api/admin/payment-settings — replace the payment details (bKash, Nagad, bank, Bangla QR).
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const { before, after } = await updatePaymentSettings(await readJsonBody(req), me.email);
    const fields = (["bkashNumber", "bkashType", "nagadNumber", "nagadType", "bankDetails", "banglaQrImage", "banglaQrMerchant", "note"] as const).filter((k) => before[k] !== after[k]);
    // Payment numbers decide where members' money goes: log old and new values.
    await logActivity({
      category: "PAYMENT",
      action: "payment_settings.updated",
      summary: `Changed payment details: ${fields.length ? fields.join(", ") : "no changes"}`,
      actor: me,
      targetType: "Setting",
      targetId: "payment",
      metadata: Object.fromEntries(fields.map((k) => [k, { from: before[k], to: after[k] }])),
      req,
    });
    return NextResponse.json({ settings: after });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/payment-settings");
  }
}
