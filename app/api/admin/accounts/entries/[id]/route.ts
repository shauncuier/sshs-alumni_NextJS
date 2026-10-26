import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { getEntry, updatePendingEntry } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/accounts/entries/[id] — one voucher.
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireFinance();
    const entry = await getEntry((await params).id);
    if (!entry) throw new AppError("ENTRY_NOT_FOUND", 404, "Voucher not found.");
    return NextResponse.json({ entry });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/entries/[id]");
  }
}

// PATCH /api/admin/accounts/entries/[id] — correct a voucher that is still waiting for approval.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const body = await readJsonBody(req);
    const entry = await updatePendingEntry((await params).id, body, me);
    await logActivity({
      category: "PAYMENT",
      action: "finance.entry_edited",
      summary: `${entry.voucherNo} corrected before approval: ${formatPoisha(entry.amount)}, ${entry.description}`,
      actor: me,
      targetType: "FinanceEntry",
      targetId: entry.id,
      metadata: { fields: Object.keys(body), amount: entry.amount },
      req,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/accounts/entries/[id]");
  }
}
