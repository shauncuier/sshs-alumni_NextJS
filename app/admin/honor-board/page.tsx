"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Medal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, ImageField, primary } from "@/components/admin/content-kit";

interface Entry {
  id: string;
  honour: string;
  name: string;
  period: string | null;
  sscBatch: number | null;
  photoUrl: string | null;
  note: string | null;
  sortOrder: number;
}

interface Draft {
  id?: string;
  honour: string;
  name: string;
  period: string;
  sscBatch: string;
  photoUrl: string | null;
  note: string;
}

function Editor({ draft, honours, onClose, onSaved }: { draft: Draft; honours: string[]; onClose: () => void; onSaved: (message: string) => void }) {
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
      if (id) await api(`/api/admin/honor-board/${id}`, "PATCH", body);
      else await api("/api/admin/honor-board", "POST", body);
      onSaved(`${form.name} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit honor board entry" : "Add to the honor board"} onClose={onClose}>
      <div>
        <Field id="h-honour" title="Honour (group heading)" required value={form.honour} max={200} onChange={(v) => set("honour", v)} placeholder="Past presidents, Founding members…" />
        {honours.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {honours.map((h) => (
              <button key={h} type="button" onClick={() => set("honour", h)} className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-[11px] font-semibold text-slate-700 cursor-pointer">{h}</button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="h-name" title="Name" required value={form.name} max={200} onChange={(v) => set("name", v)} />
        <Field id="h-period" title="Period" value={form.period} max={100} onChange={(v) => set("period", v)} placeholder="e.g. 2006–2010" />
        <Field id="h-batch" title="SSC batch" numeric value={form.sscBatch} max={4} onChange={(v) => set("sscBatch", v)} />
        <Field id="h-note" title="Extra line" value={form.note} max={300} onChange={(v) => set("note", v)} />
      </div>
      <ImageField title="Photo" portrait value={form.photoUrl} onChange={(url) => set("photoUrl", url)} onError={setError} onBusy={setUploading} />
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </Dialog>
  );
}

export default function AdminHonorBoardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const honours = useMemo(() => [...new Set(entries.map((e) => e.honour))], [entries]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries((await api("/api/admin/honor-board", "GET")).entries);
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
    if (other < 0 || other >= entries.length) return;
    const list = [...entries];
    [list[index], list[other]] = [list[other], list[index]];
    void run(() => Promise.all(list.map((e, i) => (e.sortOrder === i + 1 ? null : api(`/api/admin/honor-board/${e.id}`, "PATCH", { sortOrder: i + 1 })))), "Order saved.");
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Honor Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">Names on /honor-board, grouped by honour in the order below.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/honor-board" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button onClick={() => setEditing({ honour: honours[0] ?? "", name: "", period: "", sscBatch: "", photoUrl: null, note: "" })} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> Add name
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && entries.length === 0 && (
          <li className="py-12 text-center">
            <Medal className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">The honor board is empty.</p>
          </li>
        )}
        {entries.map((e, i) => (
          <li key={e.id} className="p-3 sm:px-5 flex items-center gap-3">
            <img loading="lazy" decoding="async" src={e.photoUrl ?? "/placeholders/person.svg"} alt="" className="w-10 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">{e.honour}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{e.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{[e.period, e.sscBatch ? `SSC ${e.sscBatch}` : null, e.note].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)} className={`${ghost} px-2`}><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" aria-label="Move down" disabled={busy || i === entries.length - 1} onClick={() => move(i, 1)} className={`${ghost} px-2`}><ArrowDown className="w-3.5 h-3.5" /></button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing({ id: e.id, honour: e.honour, name: e.name, period: e.period ?? "", sscBatch: e.sscBatch ? String(e.sscBatch) : "", photoUrl: e.photoUrl, note: e.note ?? "" })}
                className={ghost}
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Remove ${e.name}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove ${e.name} from the honor board?`)) void run(() => api(`/api/admin/honor-board/${e.id}`, "DELETE"), `${e.name} removed.`);
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
          honours={honours}
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
