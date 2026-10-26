import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinance } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { eventProfitLoss, saveBudget } from "@/lib/finance/reports";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ eventId: string }> };

// GET /api/admin/accounts/budgets/[eventId] — the event's budget and profit & loss against it.
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireFinance();
    return NextResponse.json(await eventProfitLoss((await params).eventId));
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/budgets/[eventId]");
  }
}

// PUT /api/admin/accounts/budgets/[eventId] { lines: [{ categoryId, label, plannedAmount }] } — replace the budget.
export async function PUT(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const eventId = (await params).eventId;
    const body = await readJsonBody(req);
    const budget = await saveBudget(eventId, body.lines);
    const planned = budget.reduce((n, l) => n + (l.kind === "EXPENSE" ? l.plannedAmount : 0), 0);
    await logActivity({
      category: "PAYMENT",
      action: "finance.budget_saved",
      summary: `Saved the budget: ${budget.length} lines, planned spending ${formatPoisha(planned)}`,
      actor: me,
      targetType: "Event",
      targetId: eventId,
      req,
    });
    return NextResponse.json(await eventProfitLoss(eventId));
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/accounts/budgets/[eventId]");
  }
}
