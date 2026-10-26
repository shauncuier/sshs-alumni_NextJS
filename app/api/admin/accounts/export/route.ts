import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { toCsv } from "@/lib/finance/csv";
import { periodOf, todayYmd } from "@/lib/finance/dates";
import { listEntries } from "@/lib/finance/entries";
import { requireFinance } from "@/lib/finance/guard";
import { plainPoisha } from "@/lib/finance/money";
import { accountBalances, cashBook, eventProfitLoss, incomeExpenditure, monthlySummary } from "@/lib/finance/reports";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// GET /api/admin/accounts/export?report=entries|cashbook|balances|summary|monthly|event&… — a CSV for Excel.
// Reading only, but every export is logged: it carries the association's money records.
export async function GET(req: Request) {
  try {
    const me = await requireFinance();
    const sp = new URL(req.url).searchParams;
    const report = sp.get("report") ?? "";
    const { from, to } = periodOf(sp);
    let rows: (string | number | null)[][];
    let name: string;

    if (report === "entries") {
      const entries = await listEntries(Object.fromEntries(sp), 10_000);
      name = `vouchers_${from}_${to}`;
      rows = [
        ["Voucher", "Date", "Kind", "Amount (BDT)", "Account", "To account", "Category", "Event", "Payer / payee", "Description", "Reference", "Status", "Entered by", "Approved by", "Void reason"],
        ...entries.map((e) => [e.voucherNo, e.date, e.kind, plainPoisha(e.amount), e.accountName, e.toAccountName, e.categoryName, e.eventTitle, e.party, e.description, e.reference, e.status, e.createdBy, e.approvedBy, e.voidReason]),
      ];
    } else if (report === "cashbook") {
      const book = await cashBook(sp.get("accountId") || null, from, to);
      name = `cash-book_${book.accountName.replace(/\W+/g, "-")}_${from}_${to}`;
      rows = [
        ["Date", "Voucher", "Description", "Payer / payee", "Category", "In (BDT)", "Out (BDT)", "Balance (BDT)"],
        [from, "", "Opening balance", "", "", "", "", plainPoisha(book.opening)],
        ...book.rows.map((r) => [r.entry.date, r.entry.voucherNo, r.entry.description, r.entry.party, r.entry.categoryName ?? (r.entry.kind === "TRANSFER" ? "Transfer" : ""), r.moneyIn ? plainPoisha(r.moneyIn) : "", r.moneyOut ? plainPoisha(r.moneyOut) : "", plainPoisha(r.balance)]),
        [to, "", "Closing balance", "", "", plainPoisha(book.totalIn), plainPoisha(book.totalOut), plainPoisha(book.closing)],
      ];
    } else if (report === "balances") {
      const balances = await accountBalances(to);
      name = `balances_${to}`;
      rows = [
        ["Account", "Opening", "Income", "Expenses", "Transfers in", "Transfers out", `Balance on ${to}`],
        ...balances.map((b) => [b.name, plainPoisha(b.opening), plainPoisha(b.income), plainPoisha(b.expense), plainPoisha(b.transferIn), plainPoisha(b.transferOut), plainPoisha(b.balance)]),
        ["Total", "", "", "", "", "", plainPoisha(balances.reduce((n, b) => n + b.balance, 0))],
      ];
    } else if (report === "summary") {
      const s = await incomeExpenditure(from, to);
      name = `income-expenditure_${from}_${to}`;
      rows = [
        ["Income and expenditure", `${from} to ${to}`],
        [],
        ["Income", "Amount (BDT)"],
        ...s.income.map((c) => [c.name, plainPoisha(c.amount)]),
        ["Total income", plainPoisha(s.totalIncome)],
        [],
        ["Expenditure", "Amount (BDT)"],
        ...s.expense.map((c) => [c.name, plainPoisha(c.amount)]),
        ["Total expenditure", plainPoisha(s.totalExpense)],
        [],
        [s.surplus >= 0 ? "Surplus" : "Deficit", plainPoisha(Math.abs(s.surplus))],
      ];
    } else if (report === "monthly") {
      const year = Number(sp.get("year")) || Number(todayYmd().slice(0, 4));
      const months = await monthlySummary(year);
      name = `monthly_${year}`;
      rows = [["Month", "Income (BDT)", "Expenses (BDT)", "Surplus (BDT)"], ...months.map((m) => [`${MONTHS[m.month - 1]} ${year}`, plainPoisha(m.income), plainPoisha(m.expense), plainPoisha(m.surplus)])];
    } else if (report === "event") {
      const pl = await eventProfitLoss(sp.get("eventId") ?? "");
      name = `event-profit-loss_${pl.eventTitle.replace(/\W+/g, "-").slice(0, 40)}`;
      rows = [
        ["Category", "Kind", "Budget (BDT)", "Actual (BDT)", "Variance (BDT)"],
        ...pl.lines.map((l) => [l.name, l.kind, plainPoisha(l.planned), plainPoisha(l.actual), plainPoisha(l.variance)]),
        ["Total income", "", plainPoisha(pl.plannedIncome), plainPoisha(pl.totalIncome), ""],
        ["Total expenses", "", plainPoisha(pl.plannedExpense), plainPoisha(pl.totalExpense), ""],
        [pl.surplus >= 0 ? "Surplus" : "Deficit", "", "", plainPoisha(Math.abs(pl.surplus)), ""],
      ];
    } else {
      throw new AppError("UNKNOWN_REPORT", 400, "Unknown report.");
    }

    await logActivity({ category: "PAYMENT", action: "finance.exported", summary: `Exported ${report} (${name})`, actor: me, metadata: { report, from, to }, req });
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/accounts/export");
  }
}
