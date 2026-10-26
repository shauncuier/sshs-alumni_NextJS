"use client";

import React, { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api, Banners, Dialog, Field, ghost, input, label, primary } from "@/components/admin/content-kit";
import { AccountsHeader, taka, today, useFinanceMeta, type Account } from "@/components/admin/finance-kit";

const TYPES = [
  ["CASH", "Cash"],
  ["BKASH", "bKash"],
  ["NAGAD", "Nagad"],
  ["BANK", "Bank"],
  ["BANGLA_QR", "Bangla QR"],
  ["OTHER", "Other"],
] as const;
const METHODS = ["Cash", "bKash", "Nagad", "Bank", "Bangla QR"];

type AccountDraft = { id?: string; name: string; type: string; paymentMethod: string; openingBalance: string; openingDate: string; note: string; isActive: boolean };

function AccountDialog({ draft, onClose, onSaved }: { draft: AccountDraft; onClose: () => void; onSaved: (m: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof AccountDraft>(k: K, v: AccountDraft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id, ...body } = form;
      if (id) await api(`/api/admin/accounts/accounts/${id}`, "PATCH", body);
      else await api("/api/admin/accounts/accounts", "POST", body);
      onSaved(`${form.name} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog title={form.id ? "Edit account" : "New account"} onClose={onClose}>
      <Field id="a-name" title="Name" required value={form.name} max={120} onChange={(v) => set("name", v)} placeholder="e.g. Sonali Bank, Sitakunda branch" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="a-type" className={label}>Type *</label>
          <select id="a-type" className={input} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="a-method" className={label}>Site payments by</label>
          <select id="a-method" className={input} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="">None</option>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <Field id="a-open" title="Opening balance (৳)" numeric value={form.openingBalance} max={14} onChange={(v) => set("openingBalance", v)} />
        <div>
          <label htmlFor="a-date" className={label}>Opening date *</label>
          <input id="a-date" type="date" className={input} value={form.openingDate} onChange={(e) => set("openingDate", e.target.value)} />
        </div>
      </div>
      <Field id="a-note" title="Note" value={form.note} max={300} onChange={(v) => set("note", v)} placeholder="Account number, who holds it…" />
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded text-emerald-700" />
        In use (switched-off accounts keep their history but take no new vouchers)
      </label>
      <p className="text-[11px] text-slate-500">&quot;Site payments by&quot; decides where confirmed registration fees and donations paid that way are counted.</p>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save account
      </button>
    </Dialog>
  );
}

export default function AccountsSettingsPage() {
  const { meta, error: metaError, reload } = useFinanceMeta();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AccountDraft | null>(null);
  const [newCat, setNewCat] = useState({ name: "", kind: "EXPENSE" });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(message);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (a: Account): AccountDraft => ({
    id: a.id,
    name: a.name,
    type: a.type,
    paymentMethod: a.paymentMethod ?? "",
    openingBalance: (a.openingBalance / 100).toFixed(2).replace(/\.00$/, ""),
    openingDate: a.openingDate,
    note: a.note ?? "",
    isActive: a.isActive,
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl w-full mx-auto">
      <AccountsHeader title="Settings" subtitle="Where money is kept, and the categories vouchers use." />
      <Banners error={error ?? metaError} notice={notice} onDismiss={() => setNotice(null)} />

      {!meta ? (
        <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : (
        <>
          <section className="bg-white rounded-3xl border border-slate-200">
            <div className="p-4 flex items-center justify-between gap-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900">Accounts</h2>
                {!meta.me.canApprove && <p className="text-[11px] text-slate-500">An administrator adds accounts and sets opening balances.</p>}
              </div>
              {meta.me.canApprove && (
                <button type="button" onClick={() => setEditing({ name: "", type: "BANK", paymentMethod: "", openingBalance: "0", openingDate: today(), note: "", isActive: true })} className={ghost}>
                  <Plus className="w-4 h-4" /> Account
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {meta.accounts.map((a) => (
                <li key={a.id} className="p-3 sm:px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${a.isActive ? "text-slate-900" : "text-slate-400"}`}>{a.name}{!a.isActive && " (not in use)"}</p>
                    <p className="text-[11px] text-slate-500">
                      {TYPES.find(([v]) => v === a.type)?.[1]}
                      {a.paymentMethod ? ` · site payments by ${a.paymentMethod}` : ""} · opening {taka(a.openingBalance)} on {a.openingDate}
                      {a.note ? ` · ${a.note}` : ""}
                    </p>
                  </div>
                  {meta.me.canApprove && <button type="button" onClick={() => setEditing(edit(a))} className={ghost}>Edit</button>}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
              <h2 className="text-sm font-black text-slate-900">Categories</h2>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => api("/api/admin/accounts/categories", "POST", newCat), `Category "${newCat.name}" added.`).then(() => setNewCat({ name: "", kind: newCat.kind }));
                }}
              >
                <input aria-label="New category name" className={`${input} w-48`} maxLength={120} value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="New category" />
                <select aria-label="Kind" className={`${input} w-32`} value={newCat.kind} onChange={(e) => setNewCat({ ...newCat, kind: e.target.value })}>
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
                <button type="submit" disabled={busy || newCat.name.trim().length < 2} className={primary}><Plus className="w-4 h-4" /> Add</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {(["INCOME", "EXPENSE"] as const).map((kind) => (
                <ul key={kind} className="p-2">
                  <li className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-500">{kind === "INCOME" ? "Income" : "Expenses"}</li>
                  {meta.categories.filter((c) => c.kind === kind).map((c) => (
                    <li key={c.id} className="px-2 py-1.5 flex items-center gap-2 text-sm">
                      <span className={`flex-1 ${c.isActive ? "text-slate-800" : "text-slate-400 line-through"}`}>{c.name}</span>
                      {c.systemKey && <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">site</span>}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const name = window.prompt("New name for the category", c.name);
                          if (name && name !== c.name) void run(() => api(`/api/admin/accounts/categories/${c.id}`, "PATCH", { name }), "Category renamed.");
                        }}
                        className="text-[11px] font-bold text-emerald-800 cursor-pointer"
                      >
                        Rename
                      </button>
                      {!c.systemKey && (
                        <button type="button" disabled={busy} onClick={() => void run(() => api(`/api/admin/accounts/categories/${c.id}`, "PATCH", { isActive: !c.isActive }), c.isActive ? "Category switched off." : "Category back in use.")} className="text-[11px] font-bold text-slate-600 cursor-pointer">
                          {c.isActive ? "Switch off" : "Use again"}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>
        </>
      )}

      {editing && (
        <AccountDialog
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setNotice(m);
            void reload();
          }}
        />
      )}
    </div>
  );
}
