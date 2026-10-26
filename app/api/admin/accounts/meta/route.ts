import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { canApproveFinance } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { financeEvents } from "@/lib/finance/reports";
import { listAccounts, listCategories } from "@/lib/finance/setup";

// GET /api/admin/accounts/meta — accounts, categories and events for the forms, and what the viewer may do.
export async function GET() {
  try {
    const me = await requireFinance();
    const [accounts, categories, events] = await Promise.all([listAccounts(), listCategories(), financeEvents()]);
    return NextResponse.json({ accounts, categories, events, me: { email: me.email, role: me.role, canApprove: canApproveFinance(me.role) } });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/meta");
  }
}
