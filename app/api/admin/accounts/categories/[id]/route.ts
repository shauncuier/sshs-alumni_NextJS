import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinance } from "@/lib/finance/guard";
import { updateCategory } from "@/lib/finance/setup";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/accounts/categories/[id] — rename, reorder or switch off a category.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const body = await readJsonBody(req);
    const category = await updateCategory((await params).id, body);
    await logActivity({
      category: "PAYMENT",
      action: "finance.category_updated",
      summary: `Changed category "${category.name}"${category.isActive ? "" : " (switched off)"}`,
      actor: me,
      targetType: "FinanceCategory",
      targetId: category.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ category });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/accounts/categories/[id]");
  }
}
