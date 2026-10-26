import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createEntry, listEntries } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

// GET /api/admin/accounts/entries?from&to&accountId&categoryId&eventId&kind&status&q — vouchers, newest first.
export async function GET(req: Request) {
  try {
    await requireFinance();
    const filters = Object.fromEntries(new URL(req.url).searchParams);
    return NextResponse.json({ entries: await listEntries(filters) });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/entries");
  }
}

// POST /api/admin/accounts/entries — a new voucher (income counts at once; expenses and transfers wait for approval).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    const entry = await createEntry(await readJsonBody(req), me);
    await logActivity({
      category: "PAYMENT",
      action: "finance.entry_created",
      summary: `${entry.voucherNo}: ${entry.kind.toLowerCase()} ${formatPoisha(entry.amount)}, ${entry.description}${entry.status === "PENDING" ? " (awaiting approval)" : ""}`,
      actor: me,
      targetType: "FinanceEntry",
      targetId: entry.id,
      metadata: { voucherNo: entry.voucherNo, kind: entry.kind, amount: entry.amount, accountId: entry.accountId },
      req,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/entries");
  }
}
