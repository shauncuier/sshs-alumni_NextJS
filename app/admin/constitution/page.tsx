"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, input, label, PdfField, primary } from "@/components/admin/content-kit";

interface Doc {
  id: string;
  title: string;
  year: number;
  summary: string | null;
  fileUrl: string;
}

interface Draft {
  id?: string;
  title: string;
  year: string;
  summary: string;
  fileUrl: string | null;
}

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
      if (id) await api(`/api/admin/constitution/${id}`, "PATCH", body);
      else await api("/api/admin/constitution", "POST", body);
      onSaved(`"${form.title}" saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit constitution" : "Add a constitution version"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Field id="c-title" title="Title" required value={form.title} max={200} onChange={(v) => set("title", v)} placeholder="Constitution (amended)" />
        </div>
        <Field id="c-year" title="Year" required numeric value={form.year} max={4} onChange={(v) => set("year", v)} />
      </div>
      <div>
        <label htmlFor="c-summary" className={label}>What changed (optional)</label>
        <textarea id="c-summary" rows={3} maxLength={2000} className={input} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
      </div>
      <PdfField title="Constitution PDF *" value={form.fileUrl} onChange={(url) => set("fileUrl", url)} onError={setError} onBusy={setUploading} />
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </Dialog>
  );
}

export default function AdminConstitutionPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDocs((await api("/api/admin/constitution", "GET")).documents);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const remove = async (d: Doc) => {
    if (!window.confirm(`Delete "${d.title}" (${d.year}) and its PDF?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/constitution/${d.id}`, "DELETE");
      setNotice(`"${d.title}" deleted.`);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Constitution</h1>
          <p className="text-xs text-slate-500 mt-0.5">Each version is a PDF that anyone can download from /constitution, newest first.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/constitution" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button onClick={() => setEditing({ title: "", year: String(new Date().getFullYear()), summary: "", fileUrl: null })} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> Add version
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && docs.length === 0 && (
          <li className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No constitution uploaded yet.</p>
          </li>
        )}
        {docs.map((d) => (
          <li key={d.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{d.title} <span className="text-slate-500 font-semibold">· {d.year}</span></p>
              {d.summary && <p className="text-xs text-slate-500 line-clamp-2">{d.summary}</p>}
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2 shrink-0">
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className={ghost}><FileText className="w-3.5 h-3.5" /> PDF</a>
              <button type="button" disabled={busy} onClick={() => setEditing({ id: d.id, title: d.title, year: String(d.year), summary: d.summary ?? "", fileUrl: d.fileUrl })} className={ghost}>Edit</button>
              <button type="button" disabled={busy} onClick={() => void remove(d)} className={danger}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
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
