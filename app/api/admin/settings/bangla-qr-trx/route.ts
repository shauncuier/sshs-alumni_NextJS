import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getBanglaQrTrxSetting, setBanglaQrTrxRequired } from "@/lib/payments/bangla-qr-setting";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("payments", "Only administrators can change payment settings.");

// GET /api/admin/settings/bangla-qr-trx — whether confirming a Bangla QR payment needs our SMS TrxID.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getBanglaQrTrxSetting());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/settings/bangla-qr-trx");
  }
}

// PUT /api/admin/settings/bangla-qr-trx { required } — require the TrxID or make it optional.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    // Whether a payment needs our SMS TrxID guards against fake payments: the super admin's call.
    if (me.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", 403, "Only the super admin can change this payment setting.");
    const body = (await readJsonBody(req)) as { required?: unknown };
    if (typeof body?.required !== "boolean") throw new AppError("INVALID_INPUT", 400, "Say whether the TrxID is required or not.");
    const setting = await setBanglaQrTrxRequired(body.required, me.email);
    await logActivity({
      category: "ADMIN",
      action: body.required ? "bangla_qr_trx.required" : "bangla_qr_trx.optional",
      summary: body.required
        ? "Bangla QR payments need the TrxID from our OK Wallet SMS to be confirmed"
        : "The OK Wallet SMS TrxID is optional when confirming Bangla QR payments",
      actor: me,
      targetType: "Setting",
      targetId: "bangla-qr-trx-required",
      req,
    });
    return NextResponse.json(setting);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/settings/bangla-qr-trx");
  }
}
