import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound, unauthorized } from "next/navigation";
import PrintButton from "@/components/print/PrintButton";
import { logActivity } from "@/lib/activity-log";
import { periodOf, todayYmd } from "@/lib/finance/dates";
import { getEntry, type EntryView } from "@/lib/finance/entries";
import { formatPoisha } from "@/lib/finance/money";
import { accountBalances, cashBook, eventProfitLoss, incomeExpenditure, monthlySummary } from "@/lib/finance/reports";
import { can } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session-user";

export const metadata: Metadata = { title: "Print accounts", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const th = "border border-slate-400 px-2 py-1 text-left font-bold bg-slate-100";
const td = "border border-slate-300 px-2 py-1 align-top";
const num = `${td} text-right tabular-nums whitespace-nowrap`;

/**
 * Printable accounts, outside the admin shell: ?what=cashbook|balances|summary|monthly|event|voucher
 * with the same filters as the reports page. A4 with signature lines for the treasurer,
 * the checker and the President. Every print is logged.
 */
export default async function FinancePrintPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) unauthorized();
  if (!can(user.role, "accounts")) forbidden();

  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const what = sp.get("what") ?? "";
  const { from, to } = periodOf(sp);

  let title: string;
  let body: React.ReactNode;
  if (what === "voucher") {
    const entry = await getEntry(sp.get("id") ?? "");
    if (!entry) notFound();
    title = `${entry.kind === "INCOME" ? "Money receipt" : entry.kind === "EXPENSE" ? "Payment voucher" : "Transfer voucher"} ${entry.voucherNo}`;
    body = <Voucher e={entry} />;
  } else if (what === "cashbook") {
    const book = await cashBook(sp.get("accountId") || null, from, to);
    title = `Cash book · ${book.accountName} · ${from} to ${to}`;
    body = (
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>{["Date", "Voucher", "Details", "In (৳)", "Out (৳)", "Balance (৳)"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td className={td}>{from}</td><td className={td} /><td className={`${td} font-bold`}>Opening balance</td><td className={num} /><td className={num} /><td className={`${num} font-bold`}>{formatPoisha(book.opening)}</td></tr>
          {book.rows.map((r) => (
            <tr key={r.entry.id}>
              <td className={`${td} whitespace-nowrap`}>{r.entry.date}</td>
              <td className={`${td} font-mono`}>{r.entry.voucherNo}</td>
              <td className={td}>{r.entry.description}{r.entry.party ? ` · ${r.entry.party}` : ""}{r.entry.categoryName ? ` (${r.entry.categoryName})` : ""}</td>
              <td className={num}>{r.moneyIn ? formatPoisha(r.moneyIn) : ""}</td>
              <td className={num}>{r.moneyOut ? formatPoisha(r.moneyOut) : ""}</td>
              <td className={num}>{formatPoisha(r.balance)}</td>
            </tr>
          ))}
          <tr className="font-bold"><td className={td}>{to}</td><td className={td} /><td className={td}>Closing balance</td><td className={num}>{formatPoisha(book.totalIn)}</td><td className={num}>{formatPoisha(book.totalOut)}</td><td className={num}>{formatPoisha(book.closing)}</td></tr>
        </tbody>
      </table>
    );
  } else if (what === "balances") {
    const rows = await accountBalances(to);
    title = `Account balances on ${to}`;
    body = (
      <table className="w-full border-collapse text-[11px]">
        <thead><tr>{["Account", "Opening", "Income", "Expenses", "Transfers in", "Transfers out", "Balance"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className={td}>{b.name}</td>
              {[b.opening, b.income, b.expense, b.transferIn, b.transferOut, b.balance].map((n, i) => <td key={i} className={num}>{formatPoisha(n)}</td>)}
            </tr>
          ))}
          <tr className="font-bold"><td className={td} colSpan={6}>Total</td><td className={num}>{formatPoisha(rows.reduce((n, b) => n + b.balance, 0))}</td></tr>
        </tbody>
      </table>
    );
  } else if (what === "summary") {
    const s = await incomeExpenditure(from, to);
    title = `Income and expenditure · ${from} to ${to}`;
    body = (
      <div className="grid grid-cols-2 gap-6 text-[12px]">
        {[{ name: "Income", rows: s.income, total: s.totalIncome }, { name: "Expenditure", rows: s.expense, total: s.totalExpense }].map((side) => (
          <table key={side.name} className="w-full border-collapse self-start">
            <thead><tr><th className={th}>{side.name}</th><th className={`${th} text-right`}>৳</th></tr></thead>
            <tbody>
              {side.rows.map((r) => <tr key={r.categoryId}><td className={td}>{r.name}</td><td className={num}>{formatPoisha(r.amount)}</td></tr>)}
              <tr className="font-bold"><td className={td}>Total</td><td className={num}>{formatPoisha(side.total)}</td></tr>
            </tbody>
          </table>
        ))}
        <p className="col-span-2 text-sm font-black">{s.surplus >= 0 ? "Surplus" : "Deficit"} for the period: {formatPoisha(Math.abs(s.surplus))}</p>
      </div>
    );
  } else if (what === "monthly") {
    const year = Number(sp.get("year")) || Number(todayYmd().slice(0, 4));
    const months = await monthlySummary(year);
    title = `Month by month · ${year}`;
    body = (
      <table className="w-full border-collapse text-[12px]">
        <thead><tr>{["Month", "Income", "Expenses", "Surplus"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}><td className={td}>{MONTHS[m.month - 1]}</td><td className={num}>{formatPoisha(m.income)}</td><td className={num}>{formatPoisha(m.expense)}</td><td className={num}>{formatPoisha(m.surplus)}</td></tr>
          ))}
          <tr className="font-bold">
            <td className={td}>{year}</td>
            <td className={num}>{formatPoisha(months.reduce((n, m) => n + m.income, 0))}</td>
            <td className={num}>{formatPoisha(months.reduce((n, m) => n + m.expense, 0))}</td>
            <td className={num}>{formatPoisha(months.reduce((n, m) => n + m.surplus, 0))}</td>
          </tr>
        </tbody>
      </table>
    );
  } else if (what === "event") {
    const pl = await eventProfitLoss(sp.get("eventId") ?? "");
    title = `Budget and accounts · ${pl.eventTitle}`;
    body = (
      <>
        <table className="w-full border-collapse text-[12px]">
          <thead><tr>{["Category", "Budget", "Actual", "Difference"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {pl.lines.map((l) => (
              <tr key={l.categoryId}>
                <td className={td}>{l.kind === "INCOME" ? "Income: " : "Expense: "}{l.name}</td>
                <td className={num}>{formatPoisha(l.planned)}</td>
                <td className={num}>{formatPoisha(l.actual)}</td>
                <td className={num}>{l.variance < 0 ? "−" : "+"}{formatPoisha(Math.abs(l.variance))}</td>
              </tr>
            ))}
            <tr className="font-bold"><td className={td}>Total income</td><td className={num}>{formatPoisha(pl.plannedIncome)}</td><td className={num}>{formatPoisha(pl.totalIncome)}</td><td className={num} /></tr>
            <tr className="font-bold"><td className={td}>Total expenses</td><td className={num}>{formatPoisha(pl.plannedExpense)}</td><td className={num}>{formatPoisha(pl.totalExpense)}</td><td className={num} /></tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm font-black">{pl.surplus >= 0 ? "Surplus" : "Deficit"}: {formatPoisha(Math.abs(pl.surplus))}</p>
        <p className="text-[11px] text-slate-600">Not counted yet: {pl.pendingRegistrations.count} registration(s) waiting for payment check ({formatPoisha(pl.pendingRegistrations.amount)}), {pl.pendingVouchers} voucher(s) waiting for approval.</p>
      </>
    );
  } else {
    notFound();
  }

  await logActivity({ category: "PAYMENT", action: "finance.printed", summary: `Opened for printing: ${title}`, actor: user, metadata: { what, from, to } });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
        @page { size: A4 ${what === "cashbook" ? "landscape" : "portrait"}; margin: 12mm; }
        @media print { .no-print { display: none !important; } .sheet { box-shadow: none !important; margin: 0 !important; padding: 0 !important; } }
      `}</style>
      <div className="no-print sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/admin/accounts" className="text-xs font-semibold text-emerald-800 hover:underline">← Back to the accounts</Link>
        <PrintButton />
      </div>
      <div className="sheet bg-white shadow-md mx-auto my-6 p-8 max-w-5xl text-slate-900">
        <header className="flex items-center gap-3 border-b-2 border-[#06281e] pb-3 mb-4">
          <img src="/logo.png" alt="" className="w-14 h-14" />
          <div className="flex-1">
            <p className="font-black text-lg text-[#06281e] leading-tight">প্রাক্তন সবুজিয়ান পরিষদ · Praktan Sabujian Parishad</p>
            <p className="text-[11px] text-slate-600">Sabuj Shikshayatan Government High School, Sitakunda, Chattogram</p>
          </div>
          <p className="text-[10px] text-slate-500 text-right">Printed {new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}<br />by {user.email}</p>
        </header>
        <h1 className="text-base font-black mb-3">{title}</h1>
        {body}
        <div className="grid grid-cols-3 gap-8 mt-16 text-[11px] text-center">
          {["Prepared by (Treasurer)", "Checked by (General Secretary)", "Approved by (President)"].map((s) => (
            <div key={s} className="border-t border-slate-500 pt-1">{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Voucher({ e }: { e: EntryView }) {
  const rows: [string, React.ReactNode][] = [
    ["Voucher no.", <span key="v" className="font-mono font-bold">{e.voucherNo}</span>],
    ["Date", e.date],
    ["Amount", <span key="a" className="font-black text-base">{formatPoisha(e.amount)}</span>],
    [e.kind === "TRANSFER" ? "From account" : e.kind === "INCOME" ? "Received into" : "Paid from", e.accountName],
    ...(e.kind === "TRANSFER" ? [["To account", e.toAccountName] as [string, React.ReactNode]] : [["Category", e.categoryName] as [string, React.ReactNode]]),
    ...(e.party ? [[e.kind === "INCOME" ? "Received from" : "Paid to", e.party] as [string, React.ReactNode]] : []),
    ["Description", e.description],
    ...(e.eventTitle ? [["Event", e.eventTitle] as [string, React.ReactNode]] : []),
    ...(e.reference ? [["Reference", e.reference] as [string, React.ReactNode]] : []),
    ["Status", e.status === "APPROVED" ? `Approved by ${e.approvedBy}` : e.status === "PENDING" ? "Waiting for approval" : `VOID: ${e.voidReason}`],
    ["Entered by", e.createdBy],
  ];
  return (
    <table className={`w-full border-collapse text-[13px] ${e.status === "VOID" ? "opacity-60" : ""}`}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}><th className={`${th} w-48`}>{k}</th><td className={td}>{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
