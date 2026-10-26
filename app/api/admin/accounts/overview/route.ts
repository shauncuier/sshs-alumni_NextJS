import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requireFinance } from "@/lib/finance/guard";
import { financeOverview } from "@/lib/finance/reports";

// GET /api/admin/accounts/overview — balances, this month and year, vouchers waiting for approval.
export async function GET() {
  try {
    await requireFinance();
    return NextResponse.json(await financeOverview());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/overview");
  }
}
