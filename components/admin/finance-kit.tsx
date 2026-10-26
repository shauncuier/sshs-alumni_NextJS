"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Paperclip, Printer } from "lucide-react";
import { formatPoisha } from "@/lib/finance/money";
import { api, Dialog, ghost, input, label, primary } from "./content-kit";

/** Shared pieces of the accounts pages (/admin/accounts/*). */

export type Kind = "INCOME" | "EXPENSE" | "TRANSFER";
export type Status = "PENDING" | "APPROVED" | "VOID";

export interface Account {
  id: string;
  name: string;
  type: string;
  paymentMethod: string | null;
  openingBalance: number;
  openingDate: string;
  isActive: boolean;
  sortOrder: number;
  note: string | null;
}

export interface Category {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  systemKey: string | null;
  isActive: boolean;
}

export interface Entry {
  id: string;
  voucherNo: string;
  kind: Kind;
  date: string;
  amount: number;
  accountId: string;
  accountName: string;
  toAccountId: string | null;
  toAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  party: string | null;
  description: string;
  reference: string | null;
  attachmentUrl: string | null;
  status: Status;
  source: "MANUAL" | "REGISTRATION" | "DONATION";
  createdBy: string;
  approvedBy: string | null;
  voidedBy: string | null;
  voidReason: string | null;
}

export interface Meta {
  accounts: Account[];
  categories: Category[];
  events: { id: string; title: string; date: string }[];
  me: { email: string; role: string; canApprove: boolean };
}

export const taka = formatPoisha;
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

export function useFinanceMeta() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setMeta(await api("/api/admin/accounts/meta", "GET"));
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [reload]);
  return { meta, error, reload };
}

const TABS = [
  { href: "/admin/accounts", name: "Overview" },
  { href: "/admin/accounts/entries", name: "Vouchers" },
  { href: "/admin/accounts/reports", name: "Reports" },
  { href: "/admin/accounts/events", name: "Event budgets" },
  { href: "/admin/accounts/settings", name: "Settings" },
];

export function AccountsHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <nav aria-label="Accounts" className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-1 px-1">
        {TABS.map((t) => {
          const active = t.href === "/admin/accounts" ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-px ${active ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {t.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  const style = status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600";
  const text = status === "PENDING" ? "Awaiting approval" : status === "APPROVED" ? "Approved" : "Void";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${style}`}>{text}</span>;
}

export function KindBadge({ kind }: { kind: Kind }) {
  const style = kind === "INCOME" ? "text-emerald-700" : kind === "EXPENSE" ? "text-rose-700" : "text-sky-700";
  return <span className={`text-[10px] font-black uppercase tracking-wider ${style}`}>{kind === "INCOME" ? "Income" : kind === "EXPENSE" ? "Expense" : "Transfer"}</span>;
}

/** Signed amount: + for income, − for expenses, plain for transfers. */
export function Amount({ e }: { e: Pick<Entry, "kind" | "amount" | "status"> }) {
  const sign = e.kind === "INCOME" ? "+" : e.kind === "EXPENSE" ? "−" : "";
  const color = e.status === "VOID" ? "text-slate-400 line-through" : e.kind === "INCOME" ? "text-emerald-700" : e.kind === "EXPENSE" ? "text-rose-700" : "text-sky-700";
  return <span className={`font-black tabular-nums whitespace-nowrap ${color}`}>{sign}{taka(e.amount)}</span>;
}

interface Draft {
  id?: string;
  kind: Kind;
  date: string;
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  eventId: string;
  party: string;
  description: string;
  reference: string;
  attachmentUrl: string | null;
}

export function newDraft(kind: Kind, meta: Meta, eventId = ""): Draft {
  const cash = meta.accounts.find((a) => a.isActive && a.type === "CASH") ?? meta.accounts.find((a) => a.isActive);
  return { kind, date: today(), amount: "", accountId: cash?.id ?? "", toAccountId: "", categoryId: "", eventId, party: "", description: "", reference: "", attachmentUrl: null };
}

export function draftFromEntry(e: Entry): Draft {
  return {
    id: e.id,
    kind: e.kind,
    date: e.date,
    amount: (e.amount / 100).toFixed(2).replace(/\.00$/, ""),
    accountId: e.accountId,
    toAccountId: e.toAccountId ?? "",
    categoryId: e.categoryId ?? "",
    eventId: e.eventId ?? "",
    party: e.party ?? "",
    description: e.description,
    reference: e.reference ?? "",
    attachmentUrl: e.attachmentUrl,
  };
}

/** Add or correct a voucher, with an optional photo or PDF of the bill. */
export function EntryDialog({ draft, meta, onClose, onSaved }: { draft: Draft; meta: Meta; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));
  const accounts = meta.accounts.filter((a) => a.isActive);
  const categories = meta.categories.filter((c) => c.isActive && c.kind === form.kind);
  const kindName = form.kind === "INCOME" ? "income" : form.kind === "EXPENSE" ? "expense" : "transfer";

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/accounts/vouchers", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      set("attachmentUrl", data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const { id, ...body } = form;
      const data = id ? await api(`/api/admin/accounts/entries/${id}`, "PATCH", body) : await api("/api/admin/accounts/entries", "POST", body);
      const e = data.entry as Entry;
      onSaved(`${e.voucherNo} saved${e.status === "PENDING" ? ": it counts once an administrator approves it" : ""}.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? `Correct ${kindName} voucher` : `New ${kindName}`} onClose={onClose}>
      {!form.id && (
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
          {(["INCOME", "EXPENSE", "TRANSFER"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm((f) => ({ ...f, kind: k, categoryId: "" }))}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${form.kind === k ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
            >
              {k === "INCOME" ? "Income" : k === "EXPENSE" ? "Expense" : "Transfer"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="fe-date" className={label}>Date *</label>
          <input id="fe-date" type="date" max={today()} className={input} value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label htmlFor="fe-amount" className={label}>Amount (৳) *</label>
          <input id="fe-amount" inputMode="decimal" className={input} value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="fe-account" className={label}>{form.kind === "TRANSFER" ? "From account *" : form.kind === "INCOME" ? "Received into *" : "Paid from *"}</label>
          <select id="fe-account" className={input} value={form.accountId} onChange={(e) => set("accountId", e.target.value)}>
            <option value="">Choose…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {form.kind === "TRANSFER" ? (
          <div>
            <label htmlFor="fe-to" className={label}>To account *</label>
            <select id="fe-to" className={input} value={form.toAccountId} onChange={(e) => set("toAccountId", e.target.value)}>
              <option value="">Choose…</option>
              {accounts.filter((a) => a.id !== form.accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="fe-category" className={label}>Category *</label>
            <select id="fe-category" className={input} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="fe-desc" className={label}>Description *</label>
        <input id="fe-desc" className={input} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder={form.kind === "EXPENSE" ? "e.g. Lunch for 300 guests" : form.kind === "INCOME" ? "e.g. Sponsorship from …" : "e.g. Cash deposited to bank"} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {form.kind !== "TRANSFER" && (
          <div>
            <label htmlFor="fe-party" className={label}>{form.kind === "INCOME" ? "Received from" : "Paid to"}</label>
            <input id="fe-party" className={input} maxLength={160} value={form.party} onChange={(e) => set("party", e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="fe-ref" className={label}>Reference (TrxID, cheque or bill no.)</label>
          <input id="fe-ref" className={input} maxLength={80} value={form.reference} onChange={(e) => set("reference", e.target.value)} />
        </div>
        <div className={form.kind === "TRANSFER" ? "" : "sm:col-span-2"}>
          <label htmlFor="fe-event" className={label}>Event (for its budget)</label>
          <select id="fe-event" className={input} value={form.eventId} onChange={(e) => set("eventId", e.target.value)}>
            <option value="">Not for an event</option>
            {meta.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${ghost} w-fit`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          {form.attachmentUrl ? "Replace bill / receipt" : "Attach bill / receipt"}
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {form.attachmentUrl && (
          <>
            <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-800 underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> View</a>
            <button type="button" onClick={() => set("attachmentUrl", null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>
          </>
        )}
      </div>
      {form.kind !== "INCOME" && <p className="text-[11px] text-slate-500">Expenses and transfers count once an administrator (not you) approves them.</p>}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save voucher
      </button>
    </Dialog>
  );
}

/** One voucher in a list, with approve / void / correct / print actions where allowed. */
export function EntryItem({ e, meta, busy, onApprove, onVoid, onEdit }: { e: Entry; meta: Meta; busy: boolean; onApprove: () => void; onVoid: () => void; onEdit: () => void }) {
  const mine = e.createdBy === meta.me.email;
  const canApprove = meta.me.canApprove && e.status === "PENDING" && !mine;
  const canVoid = e.status !== "VOID" && (meta.me.canApprove || (e.status === "PENDING" && mine));
  const canEdit = e.status === "PENDING" && (mine || meta.me.canApprove);
  const detail = e.kind === "TRANSFER" ? `${e.accountName} → ${e.toAccountName}` : `${e.categoryName ?? ""} · ${e.accountName}`;
  return (
    <li className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${e.status === "VOID" ? "bg-slate-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] font-bold text-slate-700">{e.voucherNo}</span>
          <span className="text-[11px] text-slate-500">{e.date}</span>
          <KindBadge kind={e.kind} />
          <StatusBadge status={e.status} />
          {e.source !== "MANUAL" && <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">From {e.source === "REGISTRATION" ? "registration" : "donation"}</span>}
          {e.attachmentUrl && (
            <a href={e.attachmentUrl} target="_blank" rel="noreferrer" aria-label="View the bill" className="text-slate-500 hover:text-emerald-800"><Paperclip className="w-3.5 h-3.5" /></a>
          )}
        </div>
        <p className={`text-sm font-semibold mt-0.5 break-words ${e.status === "VOID" ? "text-slate-400 line-through" : "text-slate-900"}`}>{e.description}</p>
        <p className="text-[11px] text-slate-500 truncate">
          {detail}
          {e.party ? ` · ${e.party}` : ""}
          {e.eventTitle ? ` · ${e.eventTitle}` : ""}
          {e.reference ? ` · Ref ${e.reference}` : ""}
        </p>
        {e.status === "VOID" && <p className="text-[11px] text-rose-700">Void: {e.voidReason} ({e.voidedBy})</p>}
        {e.status === "PENDING" && mine && !meta.me.canApprove && <p className="text-[11px] text-amber-700">Waiting for an administrator to approve.</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Amount e={e} />
        {canApprove && (
          <button type="button" disabled={busy} onClick={onApprove} className={`${primary} min-h-[36px] py-1.5`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </button>
        )}
        {canEdit && <button type="button" disabled={busy} onClick={onEdit} className={`${ghost} min-h-[36px] py-1.5`}>Correct</button>}
        {canVoid && <button type="button" disabled={busy} onClick={onVoid} className={`${ghost} min-h-[36px] py-1.5 text-rose-700 border-rose-200`}>Void</button>}
        <a href={`/print/finance?what=voucher&id=${e.id}`} target="_blank" rel="noreferrer" aria-label={`Print ${e.voucherNo}`} className={`${ghost} min-h-[36px] py-1.5 px-2`}>
          <Printer className="w-3.5 h-3.5" />
        </a>
      </div>
    </li>
  );
}

/** Approve and void, shared by the overview and the voucher list. */
export function useEntryActions(after: (message: string) => Promise<void> | void, onError: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      await after(message);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    approve: (e: Entry) => run(() => api(`/api/admin/accounts/entries/${e.id}/approve`, "POST", {}), `${e.voucherNo} approved.`),
    void: (e: Entry) => {
      const reason = window.prompt(`Why is ${e.voucherNo} (${taka(e.amount)}) void? It stays on record.`);
      if (!reason) return;
      void run(() => api(`/api/admin/accounts/entries/${e.id}/void`, "POST", { reason }), `${e.voucherNo} voided.`);
    },
  };
}
