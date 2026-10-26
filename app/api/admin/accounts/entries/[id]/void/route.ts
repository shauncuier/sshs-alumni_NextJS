import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { voidEntry } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/accounts/entries/[id]/void { reason } — cancel a voucher; it stays on record.
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const body = await readJsonBody(req);
    const entry = await voidEntry((await params).id, body.reason, me);
    await logActivity({
      category: "PAYMENT",
      action: "finance.entry_voided",
      summary: `Voided ${entry.voucherNo} (${formatPoisha(entry.amount)}): ${entry.voidReason}`,
      actor: me,
      targetType: "FinanceEntry",
      targetId: entry.id,
      metadata: { voucherNo: entry.voucherNo, amount: entry.amount, source: entry.source },
      req,
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/entries/[id]/void");
  }
}
