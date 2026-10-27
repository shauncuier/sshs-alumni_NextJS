"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, Landmark, Loader2, Plus, RefreshCw, Smartphone, Wallet } from "lucide-react";
import { api, Banners, ghost, primary } from "@/components/admin/content-kit";
import { AccountsHeader, draftFromEntry, EntryDialog, EntryItem, newDraft, taka, useEntryActions, useFinanceMeta, type Entry, type Kind } from "@/components/admin/finance-kit";

interface Balance {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  balance: number;
}

interface Overview {
  balances: Balance[];
  totalBalance: number;
  month: { income: number; expense: number };
  year: { income: number; expense: number };
  pending: Entry[];
  recent: Entry[];
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { CASH: Banknote, BANK: Landmark, BANGLA_QR: Landmark, BKASH: Smartphone, NAGAD: Smartphone };

export default function AccountsOverviewPage() {
  const { meta, error: metaError } = useFinanceMeta();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof newDraft> | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api("/api/admin/accounts/overview", "GET"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const actions = useEntryActions(async (m) => {
    setNotice(m);
    await load();
  }, setError);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const r = await api("/api/admin/accounts/sync", "POST", {});
      setNotice(`Brought in ${r.registrations} registration line(s) and ${r.donations} donation(s) that were not in the accounts yet.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const add = (kind: Kind) => meta && setDraft(newDraft(kind, meta));
  const surplus = (p: { income: number; expense: number }) => p.income - p.expense;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
      <AccountsHeader
        title="Accounts"
        subtitle="The association's cash book: money in, money out, and where it is kept."
        actions={
          <>
            <button type="button" onClick={() => add("INCOME")} disabled={!meta} className={ghost}><Plus className="w-4 h-4" /> Income</button>
            <button type="button" onClick={() => add("EXPENSE")} disabled={!meta} className={primary}><Plus className="w-4 h-4" /> Expense</button>
            <button type="button" onClick={() => add("TRANSFER")} disabled={!meta} className={ghost}><Plus className="w-4 h-4" /> Transfer</button>
          </>
        }
      />

      <Banners error={error ?? metaError} notice={notice} onDismiss={() => setNotice(null)} />

      {!data ? (
        <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading the accounts…</p>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 rounded-3xl bg-[#06281e] text-white p-6 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Total in hand</p>
              <p className="text-3xl font-black tabular-nums">{taka(data.totalBalance)}</p>
              <p className="text-xs text-emerald-100/80">All accounts today, approved vouchers only.</p>
            </div>
            {[
              { name: "This month", p: data.month },
              { name: "This year", p: data.year },
            ].map(({ name, p }) => (
              <div key={name} className="rounded-3xl bg-white border border-slate-200 p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{name}</p>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Income</span><span className="font-bold text-emerald-700 tabular-nums">{taka(p.income)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-600">Expenses</span><span className="font-bold text-rose-700 tabular-nums">{taka(p.expense)}</span></div>
                <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-800">{surplus(p) >= 0 ? "Surplus" : "Deficit"}</span>
                  <span className={`font-black tabular-nums ${surplus(p) >= 0 ? "text-slate-900" : "text-rose-700"}`}>{taka(Math.abs(surplus(p)))}</span>
                </div>
              </div>
            ))}
          </section>

          <section>
            <h2 className="text-sm font-black text-slate-900 mb-2">Balances</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.balances.filter((b) => b.isActive || b.balance !== 0).map((b) => {
                const Icon = ICONS[b.type] ?? Wallet;
                return (
                  <li key={b.id}>
                    <Link href={`/admin/accounts/reports?tab=cashbook&accountId=${b.id}`} className="block rounded-2xl bg-white border border-slate-200 p-4 hover:border-emerald-400">
                      <Icon className="w-5 h-5 text-emerald-700" />
                      <p className="text-xs font-semibold text-slate-600 mt-2 truncate">{b.name}</p>
                      <p className={`text-lg font-black tabular-nums ${b.balance < 0 ? "text-rose-700" : "text-slate-900"}`}>{taka(b.balance)}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {meta && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs">
              <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-900">Waiting for approval <span className="text-slate-400">({data.pending.length})</span></h2>
                {!meta.me.canApprove && <span className="text-[11px] text-slate-500">An administrator approves these.</span>}
              </div>
              {data.pending.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">Nothing is waiting.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.pending.map((e) => (
                    <EntryItem key={e.id} e={e} meta={meta} busy={actions.busy} onApprove={() => void actions.approve(e)} onVoid={() => actions.void(e)} onEdit={() => setDraft(draftFromEntry(e))} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {meta && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs">
              <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-100">
                <h2 className="text-sm font-black text-slate-900">Latest vouchers</h2>
                <Link href="/admin/accounts/entries" className="text-xs font-bold text-emerald-800 flex items-center gap-1">All vouchers <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
              {data.recent.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">No vouchers yet. {meta.me.canApprove ? "Bring in the site's income below, then add expenses." : "Add the first expense or income above."}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((e) => (
                    <EntryItem key={e.id} e={e} meta={meta} busy={actions.busy} onApprove={() => void actions.approve(e)} onVoid={() => actions.void(e)} onEdit={() => setDraft(draftFromEntry(e))} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {meta?.me.canApprove && (
            <section className="rounded-3xl border border-dashed border-slate-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Income from the website</p>
                <p className="text-xs text-slate-500">Confirmed registration fees and verified donations go into the accounts by themselves. Use this once to bring in older ones; it never counts anything twice.</p>
              </div>
              <button type="button" onClick={() => void sync()} disabled={syncing} className={`${ghost} shrink-0`}>
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Bring in site income
              </button>
            </section>
          )}
        </>
      )}

      {draft && meta && (
        <EntryDialog
          draft={draft}
          meta={meta}
          onClose={() => setDraft(null)}
          onSaved={(m) => {
            setDraft(null);
            setNotice(m);
            void load();
          }}
        />
      )}
      {actions.dialog}
    </div>
  );
}
