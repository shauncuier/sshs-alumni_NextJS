import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createDiscount, describeDiscount, listDiscounts } from "@/lib/events/discounts";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("events", "You cannot manage discounts.");

// GET /api/admin/discounts — every coupon and automatic discount, with its uses and status.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ discounts: await listDiscounts() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/discounts");
  }
}

// POST /api/admin/discounts — add a coupon code or an automatic discount.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const discount = await createDiscount(await readJsonBody(req), me.email);
    await logActivity({
      category: "EVENT",
      action: "discount.added",
      summary: `Added ${discount.code ? `coupon ${discount.code}` : `discount "${discount.label}"`}: ${describeDiscount(discount)}`,
      actor: me,
      targetType: "Discount",
      targetId: discount.id,
      req,
    });
    return NextResponse.json({ discount }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/discounts");
  }
}
