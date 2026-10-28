"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, Handshake, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, ImageField, input, label, primary } from "@/components/admin/content-kit";
import { SPONSOR_CATEGORIES, categoryLabel } from "@/lib/sponsor-categories";
import type { SponsorView } from "@/lib/sponsors";

interface Draft {
  id?: string;
  category: SponsorView["category"];
  name: string;
  nameEn: string;
  address: string;
  note: string;
  website: string;
  logoUrl: string | null;
  isPublished: boolean;
}

const toDraft = (s: SponsorView): Draft => ({
  id: s.id,
  category: s.category,
  name: s.name,
  nameEn: s.nameEn ?? "",
  address: s.address ?? "",
  note: s.note ?? "",
  website: s.website ?? "",
  logoUrl: s.logoUrl,
  isPublished: s.isPublished,
});

function Editor({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const { id, ...body } = form;
      if (id) await api(`/api/admin/sponsors/${id}`, "PATCH", body);
      else await api("/api/admin/sponsors", "POST", body);
      onSaved(`${form.name} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit sponsor" : "Add a sponsor"} onClose={onClose}>
      <div>
        <label htmlFor="s-category" className={label}>Kind of sponsor *</label>
        <select id="s-category" className={input} value={form.category} onChange={(e) => set("category", e.target.value as Draft["category"])}>
          {SPONSOR_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {form.category === "INFRASTRUCTURE" && (
          <p className="text-[11px] text-slate-500 mt-1">The first published infrastructure sponsor is also credited in the footer and on the home page.</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="s-name" title="Name (Bangla or English)" required value={form.name} max={200} onChange={(v) => set("name", v)} />
        <Field id="s-name-en" title="English name" value={form.nameEn} max={200} onChange={(v) => set("nameEn", v)} />
        <Field id="s-address" title="Address" value={form.address} max={300} onChange={(v) => set("address", v)} />
        <Field id="s-website" title="Website" value={form.website} max={500} onChange={(v) => set("website", v)} placeholder="https://" />
      </div>
      <Field id="s-note" title="One line about them" value={form.note} max={500} onChange={(v) => set("note", v)} placeholder="What they support, or their motto" />
      <ImageField title="Logo" hint="Square logo, JPEG, PNG or WebP, at least 320 px, up to 8 MB." value={form.logoUrl} onChange={(url) => set("logoUrl", url)} onError={setError} onBusy={setUploading} />
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="w-4 h-4 accent-emerald-700" />
        Show on the website
      </label>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </Dialog>
  );
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSponsors((await api("/api/admin/sponsors", "GET")).sponsors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const other = index + delta;
    if (other < 0 || other >= sponsors.length) return;
    const list = [...sponsors];
    [list[index], list[other]] = [list[other], list[index]];
    void run(() => Promise.all(list.map((s, i) => (s.sortOrder === i + 1 ? null : api(`/api/admin/sponsors/${s.id}`, "PATCH", { sortOrder: i + 1 })))), "Order saved.");
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sponsors</h1>
          <p className="text-xs text-slate-500 mt-0.5">Supporters on /sponsors, grouped by kind in the order below.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/sponsors" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button
            onClick={() => setEditing({ category: "SUPPORTER", name: "", nameEn: "", address: "", note: "", website: "", logoUrl: null, isPublished: true })}
            className={`${primary} flex-1 sm:flex-none`}
          >
            <Plus className="w-4 h-4" /> Add sponsor
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && sponsors.length === 0 && (
          <li className="py-12 text-center">
            <Handshake className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No sponsors yet.</p>
          </li>
        )}
        {sponsors.map((s, i) => (
          <li key={s.id} className={`p-3 sm:px-5 flex items-center gap-3 ${s.isPublished ? "" : "opacity-60"}`}>
            {s.logoUrl ? (
              <img loading="lazy" decoding="async" src={s.logoUrl} alt="" className="w-12 h-12 rounded-full object-contain bg-white border border-slate-200 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Handshake className="w-5 h-5" /></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate flex items-center gap-1">
                {categoryLabel(s.category)}
                {!s.isPublished && <span className="text-slate-500 flex items-center gap-0.5"><EyeOff className="w-3 h-3" /> hidden</span>}
              </p>
              <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{[s.nameEn, s.address].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)} className={`${ghost} px-2`}><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" aria-label="Move down" disabled={busy || i === sponsors.length - 1} onClick={() => move(i, 1)} className={`${ghost} px-2`}><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" disabled={busy} onClick={() => setEditing(toDraft(s))} className={ghost}>Edit</button>
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove ${s.name} from the sponsors?`)) void run(() => api(`/api/admin/sponsors/${s.id}`, "DELETE"), `${s.name} removed.`);
                }}
                className={`${danger} px-2`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <Editor
          draft={editing}
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
