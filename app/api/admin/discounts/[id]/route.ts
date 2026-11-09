import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteDiscount, describeDiscount, updateDiscount } from "@/lib/events/discounts";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("events", "You cannot manage discounts.");
const nameOf = (d: { code: string | null; label: string }) => (d.code ? `coupon ${d.code}` : `discount "${d.label}"`);

// PATCH /api/admin/discounts/[id] — edit, switch off or extend a discount.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const discount = await updateDiscount((await params).id, body);
    await logActivity({
      category: "EVENT",
      action: "discount.updated",
      summary: `Edited ${nameOf(discount)}: ${describeDiscount(discount)}${discount.isActive ? "" : " (off)"}`,
      actor: me,
      targetType: "Discount",
      targetId: discount.id,
      metadata: { fields: Object.keys(body ?? {}) },
      req,
    });
    return NextResponse.json({ discount });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/discounts/[id]");
  }
}

// DELETE /api/admin/discounts/[id] — remove it; registrations that used it keep their price.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteDiscount((await params).id);
    await logActivity({
      category: "EVENT",
      action: "discount.deleted",
      summary: `Removed ${nameOf(removed)}`,
      actor: me,
      targetType: "Discount",
      targetId: removed.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/discounts/[id]");
  }
}
