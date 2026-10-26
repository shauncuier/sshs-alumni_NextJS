"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Download, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";
import { api, Banners, ghost, input, primary } from "@/components/admin/content-kit";
import { AccountsHeader, taka, useFinanceMeta } from "@/components/admin/finance-kit";

interface PL {
  eventId: string;
  eventTitle: string;
  budget: { id: string; categoryId: string; label: string | null; plannedAmount: number; kind: "INCOME" | "EXPENSE" }[];
  lines: { categoryId: string; name: string; kind: "INCOME" | "EXPENSE"; planned: number; actual: number; variance: number }[];
  totalIncome: number;
  totalExpense: number;
  plannedIncome: number;
  plannedExpense: number;
  surplus: number;
  pendingRegistrations: { count: number; amount: number };
  pendingVouchers: number;
}

type Line = { categoryId: string; label: string; plannedAmount: string };

const th = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50";
const td = "px-3 py-2 border-t border-slate-100";
const num = `${td} text-right tabular-nums whitespace-nowrap`;

export default function EventBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const { meta } = useFinanceMeta();
  const [pl, setPl] = useState<PL | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (data: PL) => {
    setPl(data);
    setLines(data.budget.map((b) => ({ categoryId: b.categoryId, label: b.label ?? "", plannedAmount: (b.plannedAmount / 100).toFixed(2).replace(/\.00$/, "") })));
    setDirty(false);
  };
  const load = useCallback(async () => {
    try {
      apply(await api(`/api/admin/accounts/budgets/${id}`, "GET"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const change = (i: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const move = (i: number, d: number) => {
    setLines((ls) => {
      const next = [...ls];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      apply(await api(`/api/admin/accounts/budgets/${id}`, "PUT", { lines }));
      setNotice("Budget saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const categories = meta?.categories.filter((c) => c.isActive) ?? [];

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
      <AccountsHeader
        title={pl ? pl.eventTitle : "Event budget"}
        subtitle="Budget against actual money, by category. Only approved vouchers count as actual."
        actions={
          <>
            <Link href="/admin/accounts/events" className={ghost}><ArrowLeft className="w-4 h-4" /> Events</Link>
            <a href={`/print/finance?what=event&eventId=${id}`} target="_blank" rel="noreferrer" className={ghost}><Printer className="w-4 h-4" /> Print</a>
            <a href={`/api/admin/accounts/export?report=event&eventId=${id}`} className={ghost}><Download className="w-4 h-4" /> Excel (CSV)</a>
          </>
        }
      />
      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      {!pl ? (
        <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Income", actual: pl.totalIncome, planned: pl.plannedIncome, color: "text-emerald-700" },
              { name: "Expenses", actual: pl.totalExpense, planned: pl.plannedExpense, color: "text-rose-700" },
            ].map((c) => (
              <div key={c.name} className="rounded-2xl bg-white border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.name}</p>
                <p className={`text-xl font-black tabular-nums ${c.color}`}>{taka(c.actual)}</p>
                <p className="text-[11px] text-slate-500">Budget {taka(c.planned)}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-[#06281e] text-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{pl.surplus >= 0 ? "Surplus" : "Deficit"}</p>
              <p className="text-xl font-black tabular-nums">{taka(Math.abs(pl.surplus))}</p>
              <p className="text-[11px] text-emerald-100/80">Planned {taka(pl.plannedIncome - pl.plannedExpense)}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Not counted yet</p>
              <p className="text-sm font-bold text-amber-900">{pl.pendingRegistrations.count} registration{pl.pendingRegistrations.count === 1 ? "" : "s"} · {taka(pl.pendingRegistrations.amount)}</p>
              <p className="text-[11px] text-amber-800">waiting for payment check; {pl.pendingVouchers} voucher{pl.pendingVouchers === 1 ? "" : "s"} waiting for approval</p>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr>
                  <th className={th}>Category</th>
                  <th className={`${th} text-right`}>Budget</th>
                  <th className={`${th} text-right`}>Actual</th>
                  <th className={`${th} text-right`}>Difference</th>
                </tr>
              </thead>
              <tbody>
                {pl.lines.length === 0 && <tr><td className={`${td} text-slate-500`} colSpan={4}>No budget and no money for this event yet.</td></tr>}
                {pl.lines.map((l) => (
                  <tr key={l.categoryId}>
                    <td className={td}>
                      <span className={`text-[10px] font-black uppercase mr-2 ${l.kind === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>{l.kind === "INCOME" ? "In" : "Out"}</span>
                      {l.name}
                    </td>
                    <td className={num}>{taka(l.planned)}</td>
                    <td className={num}>{taka(l.actual)}</td>
                    <td className={`${num} font-bold ${l.variance < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {l.variance < 0 ? "−" : "+"}{taka(Math.abs(l.variance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-100">Difference: green is good news (more income or less spending than planned), red needs attention.</p>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-slate-900">Budget</h2>
              <button type="button" onClick={() => { setLines((ls) => [...ls, { categoryId: "", label: "", plannedAmount: "" }]); setDirty(true); }} className={ghost}>
                <Plus className="w-4 h-4" /> Add line
              </button>
            </div>
            {lines.length === 0 && <p className="text-xs text-slate-500">No budget yet. Add lines such as Food & catering ৳3,00,000 or Event registration fees ৳5,00,000 (expected income).</p>}
            <ul className="space-y-2">
              {lines.map((l, i) => (
                <li key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_9rem_auto] gap-2 items-center">
                  <select aria-label="Category" className={input} value={l.categoryId} onChange={(e) => change(i, { categoryId: e.target.value })}>
                    <option value="">Choose a category…</option>
                    <optgroup label="Expected income">{categories.filter((c) => c.kind === "INCOME").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                    <optgroup label="Planned spending">{categories.filter((c) => c.kind === "EXPENSE").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                  </select>
                  <input aria-label="Note" className={input} maxLength={160} value={l.label} onChange={(e) => change(i, { label: e.target.value })} placeholder="Note (optional)" />
                  <input aria-label="Amount" inputMode="decimal" className={`${input} text-right`} value={l.plannedAmount} onChange={(e) => change(i, { plannedAmount: e.target.value })} placeholder="৳" />
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={`${ghost} px-2`}><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label="Move down" disabled={i === lines.length - 1} onClick={() => move(i, 1)} className={`${ghost} px-2`}><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" aria-label="Remove line" onClick={() => { setLines((ls) => ls.filter((_, j) => j !== i)); setDirty(true); }} className={`${ghost} px-2 text-rose-700`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button type="button" disabled={!dirty || saving} onClick={() => void save()} className={primary}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save budget
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
