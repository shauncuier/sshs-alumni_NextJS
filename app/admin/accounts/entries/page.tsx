"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Plus, Search } from "lucide-react";
import { api, Banners, ghost, input, label, primary } from "@/components/admin/content-kit";
import { AccountsHeader, draftFromEntry, EntryDialog, EntryItem, newDraft, taka, useEntryActions, useFinanceMeta, type Entry } from "@/components/admin/finance-kit";

const EMPTY = { from: "", to: "", accountId: "", categoryId: "", eventId: "", kind: "", status: "", q: "" };

export default function AccountsEntriesPage() {
  const { meta, error: metaError } = useFinanceMeta();
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof newDraft> | null>(null);
  const query = new URLSearchParams(Object.entries(applied).filter(([, v]) => v)).toString();

  const load = useCallback(async () => {
    try {
      setEntries((await api(`/api/admin/accounts/entries?${query}`, "GET")).entries);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [query]);
  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const actions = useEntryActions(async (m) => {
    setNotice(m);
    await load();
  }, setError);
  const set = (key: keyof typeof EMPTY, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const counted = (entries ?? []).filter((e) => e.status === "APPROVED");
  const totalIn = counted.filter((e) => e.kind === "INCOME").reduce((n, e) => n + e.amount, 0);
  const totalOut = counted.filter((e) => e.kind === "EXPENSE").reduce((n, e) => n + e.amount, 0);

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <AccountsHeader
        title="Vouchers"
        subtitle="Every receipt (R), payment (P) and transfer (T). Nothing is deleted; mistakes are voided with a reason."
        actions={
          <>
            <a href={`/api/admin/accounts/export?report=entries&${query}`} className={ghost}><Download className="w-4 h-4" /> Excel (CSV)</a>
            <button type="button" disabled={!meta} onClick={() => meta && setDraft(newDraft("EXPENSE", meta))} className={primary}><Plus className="w-4 h-4" /> New voucher</button>
          </>
        }
      />

      <Banners error={error ?? metaError} notice={notice} onDismiss={() => setNotice(null)} />

      <form
        className="bg-white rounded-3xl border border-slate-200 p-4 grid grid-cols-2 lg:grid-cols-4 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        <div>
          <label htmlFor="f-from" className={label}>From</label>
          <input id="f-from" type="date" className={input} value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-to" className={label}>To</label>
          <input id="f-to" type="date" className={input} value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-kind" className={label}>Kind</label>
          <select id="f-kind" className={input} value={filters.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className={label}>Status</label>
          <select id="f-status" className={input} value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Awaiting approval</option>
            <option value="APPROVED">Approved</option>
            <option value="VOID">Void</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-account" className={label}>Account</label>
          <select id="f-account" className={input} value={filters.accountId} onChange={(e) => set("accountId", e.target.value)}>
            <option value="">All</option>
            {meta?.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-category" className={label}>Category</label>
          <select id="f-category" className={input} value={filters.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">All</option>
            {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind === "INCOME" ? "in" : "out"})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-event" className={label}>Event</label>
          <select id="f-event" className={input} value={filters.eventId} onChange={(e) => set("eventId", e.target.value)}>
            <option value="">All</option>
            {meta?.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-q" className={label}>Search</label>
          <input id="f-q" className={input} value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Voucher, name, TrxID…" />
        </div>
        <div className="col-span-2 lg:col-span-4 flex flex-wrap gap-2 justify-end">
          <button type="button" className={ghost} onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>Clear</button>
          <button type="submit" className={primary}><Search className="w-4 h-4" /> Show</button>
        </div>
      </form>

      {entries && (
        <p className="text-xs text-slate-600">
          {entries.length} voucher{entries.length === 1 ? "" : "s"} · approved income <b className="text-emerald-700">{taka(totalIn)}</b> · approved expenses <b className="text-rose-700">{taka(totalOut)}</b>
          {entries.length === 500 ? " · showing the latest 500; narrow the dates for more" : ""}
        </p>
      )}

      {!entries || !meta ? (
        <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : entries.length === 0 ? (
        <p className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">No vouchers match.</p>
      ) : (
        <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {entries.map((e) => (
            <EntryItem key={e.id} e={e} meta={meta} busy={actions.busy} onApprove={() => void actions.approve(e)} onVoid={() => actions.void(e)} onEdit={() => setDraft(draftFromEntry(e))} />
          ))}
        </ul>
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
    </div>
  );
}
