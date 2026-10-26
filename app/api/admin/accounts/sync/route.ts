import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireFinanceAdmin } from "@/lib/finance/guard";
import { syncFromSite } from "@/lib/finance/posting";
import { requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// POST /api/admin/accounts/sync — post every paid registration and verified donation not in the books yet.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireFinanceAdmin("Only an administrator can bring the site's income into the accounts.");
    requireRateLimit(req, "finance-sync", { limit: 10, windowMs: 10 * 60_000 });
    const result = await syncFromSite(me.email);
    await logActivity({
      category: "PAYMENT",
      action: "finance.synced",
      summary: `Brought site income into the accounts: ${result.registrations} registration line(s), ${result.donations} donation(s)`,
      actor: me,
      metadata: result,
      req,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/sync");
  }
}
