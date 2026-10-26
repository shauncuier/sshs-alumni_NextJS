import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { approveEntry } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/accounts/entries/[id]/approve — an administrator (not the one who entered it) approves a voucher.
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const entry = await approveEntry((await params).id, me);
    await logActivity({
      category: "PAYMENT",
      action: "finance.entry_approved",
      summary: `Approved ${entry.voucherNo}: ${entry.kind.toLowerCase()} ${formatPoisha(entry.amount)} (entered by ${entry.createdBy})`,
      actor: me,
      targetType: "FinanceEntry",
      targetId: entry.id,
      metadata: { voucherNo: entry.voucherNo, amount: entry.amount },
      req,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/entries/[id]/approve");
  }
}
