"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { api, Banners, ghost, input, label } from "@/components/admin/content-kit";
import { AccountsHeader, taka, today, useFinanceMeta, type Entry } from "@/components/admin/finance-kit";

type Tab = "cashbook" | "balances" | "summary" | "monthly";
const TABS: { key: Tab; name: string }[] = [
  { key: "cashbook", name: "Cash book" },
  { key: "balances", name: "Balances" },
  { key: "summary", name: "Income & expenditure" },
  { key: "monthly", name: "Month by month" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CashBook {
  accountName: string;
  opening: number;
  rows: { entry: Entry; moneyIn: number; moneyOut: number; balance: number }[];
  totalIn: number;
  totalOut: number;
  closing: number;
}
interface Balance { id: string; name: string; opening: number; income: number; expense: number; transferIn: number; transferOut: number; balance: number }
interface Summary { income: { name: string; amount: number }[]; expense: { name: string; amount: number }[]; totalIncome: number; totalExpense: number; surplus: number }
interface Month { month: number; income: number; expense: number; surplus: number }

const th = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50";
const td = "px-3 py-2 border-t border-slate-100 align-top";
const num = `${td} text-right tabular-nums whitespace-nowrap`;

export default function AccountsReportsPage() {
  const { meta, error: metaError } = useFinanceMeta();
  const [tab, setTab] = useState<Tab>("cashbook");
  const [from, setFrom] = useState(`${today().slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today());
  const [accountId, setAccountId] = useState("");
  const [year, setYear] = useState(Number(today().slice(0, 4)));
  // The data is kept with the query it answers: switching tabs renders the new table only
  // once its own data has arrived, never with the previous tab's.
  const [result, setResult] = useState<{ query: string; data: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Links from the overview open a tab and an account: ?tab=cashbook&accountId=…
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab") as Tab | null;
    if (t && TABS.some((x) => x.key === t)) setTab(t); // eslint-disable-line react-hooks/set-state-in-effect
    if (sp.get("accountId")) setAccountId(sp.get("accountId")!);
  }, []);

  const params = new URLSearchParams({ report: tab, from, to, year: String(year), ...(accountId ? { accountId } : {}) }).toString();

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult({ query: params, data: await api(`/api/admin/accounts/reports?${params}`, "GET") });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [params]);
  const data = result && result.query === params ? result.data : null;
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const printWhat = tab === "monthly" ? "monthly" : tab;

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <AccountsHeader
        title="Reports"
        subtitle="Only approved vouchers count. Print for the committee, or open in Excel."
        actions={
          <>
            <a href={`/print/finance?what=${printWhat}&${params}`} target="_blank" rel="noreferrer" className={ghost}><Printer className="w-4 h-4" /> Print</a>
            <a href={`/api/admin/accounts/export?${params}`} className={ghost}><Download className="w-4 h-4" /> Excel (CSV)</a>
          </>
        }
      />
      <Banners error={error ?? metaError} notice={null} onDismiss={() => {}} />

      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === t.key ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tab === "monthly" ? (
          <div>
            <label htmlFor="r-year" className={label}>Year</label>
            <input id="r-year" type="number" min={2015} max={2100} className={input} value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
          </div>
        ) : (
          <>
            {tab !== "balances" && (
              <div>
                <label htmlFor="r-from" className={label}>From</label>
                <input id="r-from" type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
            )}
            <div>
              <label htmlFor="r-to" className={label}>{tab === "balances" ? "Balance on" : "To"}</label>
              <input id="r-to" type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            {tab === "cashbook" && (
              <div className="col-span-2">
                <label htmlFor="r-account" className={label}>Account</label>
                <select id="r-account" className={input} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  <option value="">All accounts together (no transfers)</option>
                  {meta?.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {!data ? (
        !error && <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Working it out…</p>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto">
          {tab === "cashbook" && <CashBookTable book={data as CashBook} from={from} to={to} />}
          {tab === "balances" && <BalancesTable rows={(data as { balances: Balance[] }).balances} />}
          {tab === "summary" && <SummaryTable s={data as Summary} />}
          {tab === "monthly" && <MonthlyTable months={(data as { months: Month[] }).months} year={year} />}
        </div>
      )}
    </div>
  );
}

function CashBookTable({ book, from, to }: { book: CashBook; from: string; to: string }) {
  return (
    <table className="w-full text-sm min-w-[720px]">
      <thead>
        <tr>
          <th className={th}>Date</th>
          <th className={th}>Voucher</th>
          <th className={th}>Details</th>
          <th className={`${th} text-right`}>In</th>
          <th className={`${th} text-right`}>Out</th>
          <th className={`${th} text-right`}>Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr className="bg-emerald-50/50">
          <td className={td}>{from}</td>
          <td className={td} />
          <td className={`${td} font-bold`}>Opening balance · {book.accountName}</td>
          <td className={num} />
          <td className={num} />
          <td className={`${num} font-bold`}>{taka(book.opening)}</td>
        </tr>
        {book.rows.map((r) => (
          <tr key={r.entry.id}>
            <td className={`${td} whitespace-nowrap`}>{r.entry.date}</td>
            <td className={`${td} font-mono text-xs`}>{r.entry.voucherNo}</td>
            <td className={td}>
              {r.entry.description}
              <span className="block text-[11px] text-slate-500">
                {r.entry.kind === "TRANSFER" ? `${r.entry.accountName} → ${r.entry.toAccountName}` : r.entry.categoryName}
                {r.entry.party ? ` · ${r.entry.party}` : ""}
              </span>
            </td>
            <td className={`${num} text-emerald-700`}>{r.moneyIn ? taka(r.moneyIn) : ""}</td>
            <td className={`${num} text-rose-700`}>{r.moneyOut ? taka(r.moneyOut) : ""}</td>
            <td className={num}>{taka(r.balance)}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold">
          <td className={td}>{to}</td>
          <td className={td} />
          <td className={td}>Closing balance</td>
          <td className={`${num} text-emerald-700`}>{taka(book.totalIn)}</td>
          <td className={`${num} text-rose-700`}>{taka(book.totalOut)}</td>
          <td className={num}>{taka(book.closing)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function BalancesTable({ rows }: { rows: Balance[] }) {
  return (
    <table className="w-full text-sm min-w-[720px]">
      <thead>
        <tr>
          {["Account", "Opening", "Income", "Expenses", "Transfers in", "Transfers out", "Balance"].map((h, i) => <th key={h} className={`${th} ${i ? "text-right" : ""}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.id}>
            <td className={`${td} font-semibold`}>{b.name}</td>
            <td className={num}>{taka(b.opening)}</td>
            <td className={`${num} text-emerald-700`}>{taka(b.income)}</td>
            <td className={`${num} text-rose-700`}>{taka(b.expense)}</td>
            <td className={num}>{taka(b.transferIn)}</td>
            <td className={num}>{taka(b.transferOut)}</td>
            <td className={`${num} font-bold`}>{taka(b.balance)}</td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold">
          <td className={td} colSpan={6}>Total</td>
          <td className={num}>{taka(rows.reduce((n, b) => n + b.balance, 0))}</td>
        </tr>
      </tbody>
    </table>
  );
}

function SummaryTable({ s }: { s: Summary }) {
  const block = (title: string, rows: { name: string; amount: number }[], total: number, color: string) => (
    <>
      <tr><td className={`${td} font-black text-slate-900 bg-slate-50`} colSpan={2}>{title}</td></tr>
      {rows.length === 0 && <tr><td className={`${td} text-slate-400`} colSpan={2}>None</td></tr>}
      {rows.map((r) => (
        <tr key={r.name}><td className={td}>{r.name}</td><td className={num}>{taka(r.amount)}</td></tr>
      ))}
      <tr className="font-bold"><td className={td}>Total {title.toLowerCase()}</td><td className={`${num} ${color}`}>{taka(total)}</td></tr>
    </>
  );
  return (
    <table className="w-full text-sm">
      <tbody>
        {block("Income", s.income, s.totalIncome, "text-emerald-700")}
        {block("Expenditure", s.expense, s.totalExpense, "text-rose-700")}
        <tr className="bg-emerald-50 font-black">
          <td className={td}>{s.surplus >= 0 ? "Surplus" : "Deficit"}</td>
          <td className={`${num} ${s.surplus >= 0 ? "" : "text-rose-700"}`}>{taka(Math.abs(s.surplus))}</td>
        </tr>
      </tbody>
    </table>
  );
}

function MonthlyTable({ months, year }: { months: Month[]; year: number }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  return (
    <table className="w-full text-sm min-w-[560px]">
      <thead>
        <tr>
          <th className={th}>Month</th>
          <th className={`${th} text-right`}>Income</th>
          <th className={`${th} text-right`}>Expenses</th>
          <th className={`${th} text-right`}>Surplus</th>
          <th className={th} />
        </tr>
      </thead>
      <tbody>
        {months.map((m) => (
          <tr key={m.month}>
            <td className={td}>{MONTHS[m.month - 1]} {year}</td>
            <td className={`${num} text-emerald-700`}>{taka(m.income)}</td>
            <td className={`${num} text-rose-700`}>{taka(m.expense)}</td>
            <td className={`${num} font-semibold ${m.surplus < 0 ? "text-rose-700" : ""}`}>{taka(m.surplus)}</td>
            <td className={`${td} w-40`}>
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(m.income / max) * 100}%` }} />
              <div className="h-1.5 rounded-full bg-rose-400 mt-1" style={{ width: `${(m.expense / max) * 100}%` }} />
            </td>
          </tr>
        ))}
        <tr className="bg-slate-50 font-bold">
          <td className={td}>Year</td>
          <td className={`${num} text-emerald-700`}>{taka(months.reduce((n, m) => n + m.income, 0))}</td>
          <td className={`${num} text-rose-700`}>{taka(months.reduce((n, m) => n + m.expense, 0))}</td>
          <td className={num}>{taka(months.reduce((n, m) => n + m.surplus, 0))}</td>
          <td className={td} />
        </tr>
      </tbody>
    </table>
  );
}
