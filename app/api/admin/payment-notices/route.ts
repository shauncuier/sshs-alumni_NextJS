import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { getPaymentNotices, setPaymentNotices } from "@/lib/payment-notices";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("payments", "Only administrators can change payment settings.");

// GET /api/admin/payment-notices — whether members get an SMS / email when their payment is confirmed.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getPaymentNotices());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/payment-notices");
  }
}

// PUT /api/admin/payment-notices { sms, email } — switch the confirmation SMS and email on or off.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { sms?: unknown; email?: unknown };
    if (typeof body?.sms !== "boolean" || typeof body?.email !== "boolean") {
      throw new AppError("INVALID_INPUT", 400, "Say whether the confirmation SMS and email are on or off.");
    }
    const before = await getPaymentNotices();
    const after = await setPaymentNotices({ sms: body.sms, email: body.email }, me.email);
    const onOff = (v: boolean) => (v ? "on" : "off");
    await logActivity({
      category: "PAYMENT",
      action: "payment_notices.updated",
      summary: `Payment confirmation SMS ${onOff(after.sms)}, email ${onOff(after.email)}`,
      actor: me,
      targetType: "Setting",
      targetId: "payment-notices",
      metadata: { sms: { from: before.sms, to: after.sms }, email: { from: before.email, to: after.email } },
      req,
    });
    return NextResponse.json(after);
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/payment-notices");
  }
}
