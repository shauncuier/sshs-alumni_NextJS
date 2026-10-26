import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { requireFinance } from "@/lib/finance/guard";
import { periodOf, todayYmd } from "@/lib/finance/dates";
import { accountBalances, cashBook, incomeExpenditure, monthlySummary } from "@/lib/finance/reports";

// GET /api/admin/accounts/reports?report=balances|cashbook|summary|monthly&from&to&accountId&year
export async function GET(req: Request) {
  try {
    await requireFinance();
    const sp = new URL(req.url).searchParams;
    const report = sp.get("report");
    const { from, to } = periodOf(sp);
    if (report === "balances") return NextResponse.json({ asOf: to, balances: await accountBalances(to) });
    if (report === "cashbook") return NextResponse.json(await cashBook(sp.get("accountId") || null, from, to));
    if (report === "summary") return NextResponse.json(await incomeExpenditure(from, to));
    if (report === "monthly") {
      const year = Number(sp.get("year")) || Number(todayYmd().slice(0, 4));
      if (year < 2000 || year > 2100) throw new AppError("INVALID_YEAR", 400, "Choose a year.");
      return NextResponse.json({ year, months: await monthlySummary(year) });
    }
    throw new AppError("UNKNOWN_REPORT", 400, "Unknown report.");
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/reports");
  }
}
