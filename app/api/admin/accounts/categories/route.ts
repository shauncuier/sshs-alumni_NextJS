import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinance } from "@/lib/finance/guard";
import { createCategory, listCategories } from "@/lib/finance/setup";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

// GET /api/admin/accounts/categories — income and expense categories.
export async function GET() {
  try {
    await requireFinance();
    return NextResponse.json({ categories: await listCategories() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/categories");
  }
}

// POST /api/admin/accounts/categories — add a category ({ name, kind: INCOME | EXPENSE }).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const category = await createCategory(await readJsonBody(req));
    await logActivity({
      category: "PAYMENT",
      action: "finance.category_created",
      summary: `Added ${category.kind.toLowerCase()} category "${category.name}"`,
      actor: me,
      targetType: "FinanceCategory",
      targetId: category.id,
      req,
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/categories");
  }
}
