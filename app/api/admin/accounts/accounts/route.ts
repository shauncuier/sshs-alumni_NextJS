import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinance, requireFinanceAdmin } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { createAccount, listAccounts } from "@/lib/finance/setup";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

// GET /api/admin/accounts/accounts — every account (cash, bKash, bank…).
export async function GET() {
  try {
    await requireFinance();
    return NextResponse.json({ accounts: await listAccounts() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/accounts");
  }
}

// POST /api/admin/accounts/accounts — add an account (administrators: the opening balance counts at once).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireFinanceAdmin("Only an administrator can add accounts.");
    const account = await createAccount(await readJsonBody(req));
    await logActivity({
      category: "PAYMENT",
      action: "finance.account_created",
      summary: `Added account "${account.name}" with opening balance ${formatPoisha(account.openingBalance)} on ${account.openingDate}`,
      actor: me,
      targetType: "FinanceAccount",
      targetId: account.id,
      req,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/accounts");
  }
}
