import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinanceAdmin } from "@/lib/finance/guard";
import { formatPoisha } from "@/lib/finance/money";
import { updateAccount } from "@/lib/finance/setup";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/accounts/accounts/[id] — rename, change the opening balance or switch an account off.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireFinanceAdmin("Only an administrator can change accounts.");
    const body = await readJsonBody(req);
    const account = await updateAccount((await params).id, body);
    await logActivity({
      category: "PAYMENT",
      action: "finance.account_updated",
      summary: `Changed account "${account.name}" (opening ${formatPoisha(account.openingBalance)} on ${account.openingDate}${account.isActive ? "" : ", switched off"})`,
      actor: me,
      targetType: "FinanceAccount",
      targetId: account.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ account });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/accounts/accounts/[id]");
  }
}
