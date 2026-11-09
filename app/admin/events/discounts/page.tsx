"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, RefreshCw, TicketPercent, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, input, label, primary } from "@/components/admin/content-kit";
import type { DiscountStatus, DiscountView } from "@/lib/events/discounts";

interface EventOption {
  id: string;
  title: string;
}

interface Draft {
  id?: string;
  kind: "COUPON" | "AUTOMATIC";
  code: string;
  label: string;
  type: "PERCENT" | "AMOUNT";
  value: string;
  eventId: string;
  startsOn: string;
  endsOn: string;
  maxUses: string;
  isActive: boolean;
}

const EMPTY: Draft = { kind: "COUPON", code: "", label: "", type: "AMOUNT", value: "", eventId: "", startsOn: "", endsOn: "", maxUses: "", isActive: true };

const toDraft = (d: DiscountView): Draft => ({
  id: d.id,
  kind: d.kind,
  code: d.code ?? "",
  label: d.label,
  type: d.type,
  value: String(d.value),
  eventId: d.eventId ?? "",
  startsOn: d.startsOn ?? "",
  endsOn: d.endsOn ?? "",
  maxUses: d.maxUses === null ? "" : String(d.maxUses),
  isActive: d.isActive,
});

const STATUS: Record<DiscountStatus, { text: string; cls: string }> = {
  ACTIVE: { text: "Running", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  SCHEDULED: { text: "Starts later", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  EXPIRED: { text: "Expired", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  USED_UP: { text: "Used up", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  OFF: { text: "Switched off", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const day = (ymd: string) => new Date(`${ymd}T12:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
const amountText = (d: Pick<DiscountView, "type" | "value">) => (d.type === "PERCENT" ? `${d.value}% off` : `৳${d.value.toLocaleString("en-IN")} off`);

function dates(d: DiscountView): string {
  if (d.startsOn && d.endsOn) return `${day(d.startsOn)} – ${day(d.endsOn)}`;
  if (d.endsOn) return `Until ${day(d.endsOn)}`;
  if (d.startsOn) return `From ${day(d.startsOn)}`;
  return "No end date";
}

function Editor({ draft, events, onClose, onSaved }: { draft: Draft; events: EventOption[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));
  const coupon = form.kind === "COUPON";

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const { id, ...body } = form;
      const payload = { ...body, value: body.value.trim(), maxUses: coupon ? body.maxUses.trim() : "" };
      if (id) await api(`/api/admin/discounts/${id}`, "PATCH", payload);
      else await api("/api/admin/discounts", "POST", payload);
      onSaved(`${coupon ? form.code.toUpperCase() || "Coupon" : form.label || "Discount"} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit discount" : "Add a discount"} onClose={onClose}>
      <fieldset>
        <legend className={label}>Kind</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["COUPON", "Coupon code", "Members type a code on the form"],
              ["AUTOMATIC", "Automatic", "Everyone gets it, e.g. early bird"],
            ] as const
          ).map(([value, title, hint]) => (
            <label key={value} className={`p-3 rounded-xl border cursor-pointer ${form.kind === value ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
              <input type="radio" name="d-kind" className="sr-only" checked={form.kind === value} onChange={() => set("kind", value)} />
              <span className="block text-xs font-bold text-slate-900">{title}</span>
              <span className="block text-[11px] text-slate-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {coupon && <Field id="d-code" title="Code" required value={form.code} max={40} onChange={(v) => set("code", v.toUpperCase().replace(/\s+/g, ""))} placeholder="BATCH2013" />}
        <Field id="d-label" title="Name members see" required value={form.label} max={120} onChange={(v) => set("label", v)} placeholder={coupon ? "Batch 2013 offer" : "Early bird"} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="d-type" className={label}>Discount *</label>
          <select id="d-type" className={input} value={form.type} onChange={(e) => set("type", e.target.value as Draft["type"])}>
            <option value="AMOUNT">Taka off</option>
            <option value="PERCENT">Percent off</option>
          </select>
        </div>
        <Field id="d-value" title={form.type === "PERCENT" ? "Percent (1–100)" : "Taka"} required numeric value={form.value} max={7} onChange={(v) => set("value", v.replace(/[^0-9]/g, ""))} />
      </div>
      <p className="text-[11px] text-slate-500 -mt-1">Comes off the member&apos;s own fee only. Spouse, child and other guests pay their full price.</p>

      <div>
        <label htmlFor="d-event" className={label}>Event</label>
        <select id="d-event" className={input} value={form.eventId} onChange={(e) => set("eventId", e.target.value)}>
          <option value="">Every event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="d-start" className={label}>Starts on</label>
          <input id="d-start" type="date" className={input} value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
        </div>
        <div>
          <label htmlFor="d-end" className={label}>Ends on</label>
          <input id="d-end" type="date" className={input} value={form.endsOn} min={form.startsOn || undefined} onChange={(e) => set("endsOn", e.target.value)} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 -mt-1">It stops by itself after the end date (11:59 pm Bangladesh time). Leave a date empty for no limit.</p>

      {coupon && (
        <div>
          <Field id="d-max" title="Maximum uses" numeric value={form.maxUses} max={6} onChange={(v) => set("maxUses", v.replace(/[^0-9]/g, ""))} placeholder="No limit" />
          <p className="text-[11px] text-slate-500 mt-1">Each member can use a code once. Cancelled registrations give their use back.</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-emerald-700" />
        Switched on
      </label>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </Dialog>
  );
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountView[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, e] = await Promise.all([api("/api/admin/discounts", "GET"), api("/api/admin/events", "GET")]);
      setDiscounts(d.discounts);
      setEvents((e.events as EventOption[]).map(({ id, title }) => ({ id, title })));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const remove = async (d: DiscountView) => {
    const name = d.code ?? d.label;
    const note = d.uses > 0 ? ` ${d.uses} registration${d.uses === 1 ? "" : "s"} used it; they keep their price.` : "";
    if (!window.confirm(`Delete ${name}?${note}`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/discounts/${d.id}`, "DELETE");
      setNotice(`${name} deleted.`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/admin/events" className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Events
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Discounts and coupons</h1>
          <p className="text-xs text-slate-500 mt-0.5">Lower the member&apos;s registration fee with a code or for everyone until a date. Only the biggest one applies.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setEditing(EMPTY)} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> Add discount
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && discounts.length === 0 && (
          <li className="py-12 text-center">
            <TicketPercent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No discounts yet. Add a coupon code or an early-bird discount.</p>
          </li>
        )}
        {discounts.map((d) => {
          const status = STATUS[d.status];
          return (
            <li key={d.id} className="p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {d.code ? (
                    <span className="font-mono text-sm font-black text-slate-900">{d.code}</span>
                  ) : (
                    <span className="text-[10px] font-bold text-violet-800 bg-violet-50 border border-violet-200 rounded-md px-1.5 py-0.5">Automatic</span>
                  )}
                  <span className="text-sm font-bold text-emerald-800">{amountText(d)}</span>
                  <span className={`text-[10px] font-bold border rounded-md px-1.5 py-0.5 ${status.cls}`}>{status.text}</span>
                </div>
                <p className="text-xs text-slate-700 truncate mt-0.5">{d.label} · {d.eventTitle ?? "Every event"}</p>
                <p className="text-[11px] text-slate-500">
                  {dates(d)} · Used {d.uses}
                  {d.maxUses !== null ? ` of ${d.maxUses}` : ""} time{d.uses === 1 && d.maxUses === null ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" disabled={busy} onClick={() => setEditing(toDraft(d))} className={ghost}>Edit</button>
                <button type="button" aria-label={`Delete ${d.code ?? d.label}`} disabled={busy} onClick={() => void remove(d)} className={`${danger} px-2`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing && (
        <Editor
          draft={editing}
          events={events}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            void load();
          }}
        />
      )}
    </div>
  );
}
