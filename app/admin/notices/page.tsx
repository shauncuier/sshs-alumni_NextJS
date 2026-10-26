"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Megaphone, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, input, label, PdfField, primary } from "@/components/admin/content-kit";

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string;
  author: string;
  isActive: boolean;
  attachmentUrl: string | null;
  date: string;
  updatedAt: string;
  updatedBy: string | null;
}

type Draft = Pick<Notice, "title" | "content" | "priority" | "author" | "attachmentUrl"> & { id?: string };

const PRIORITY_STYLE: Record<string, string> = {
  NORMAL: "bg-slate-100 text-slate-700",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-rose-100 text-rose-800",
};

function Editor({ draft, priorities, onClose, onSaved }: { draft: Draft; priorities: string[]; onClose: () => void; onSaved: (message: string) => void }) {
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
      if (id) await api(`/api/admin/notices/${id}`, "PATCH", body);
      else await api("/api/admin/notices", "POST", { ...body, isActive: true });
      onSaved(id ? `"${form.title}" saved.` : `"${form.title}" is on the notice board.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit notice" : "New notice"} onClose={onClose}>
      <Field id="n-title" title="Title" required value={form.title} max={190} onChange={(v) => set("title", v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-priority" className={label}>Priority</label>
          <select id="n-priority" className={input} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {priorities.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <Field id="n-author" title="Signed by" value={form.author} max={120} onChange={(v) => set("author", v)} />
      </div>
      <div>
        <label htmlFor="n-content" className={label}>Notice *</label>
        <textarea id="n-content" rows={8} className={`${input} leading-relaxed`} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Leave an empty line between paragraphs." />
      </div>
      <PdfField title="Attachment (optional)" value={form.attachmentUrl} onChange={(url) => set("attachmentUrl", url)} onError={setError} onBusy={setUploading} />
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.id ? "Save notice" : "Post notice"}
      </button>
    </Dialog>
  );
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [priorities, setPriorities] = useState<string[]>(["NORMAL", "HIGH", "URGENT"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/admin/notices", "GET");
      setNotices(data.notices);
      setPriorities(data.priorities);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const act = async (n: Notice, body: Record<string, unknown> | null, message: string) => {
    if (!body && !window.confirm(`Delete "${n.title}"? This cannot be undone.`)) return;
    setBusyId(n.id);
    setError(null);
    try {
      await api(`/api/admin/notices/${n.id}`, body ? "PATCH" : "DELETE", body ?? undefined);
      setNotice(message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notice Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">Notices appear on /notices and the home page until hidden.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/notices" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button onClick={() => setEditing({ title: "", content: "", priority: "NORMAL", author: "Praktan Sabujian Parishad", attachmentUrl: null })} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> New notice
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && notices.length === 0 && (
          <li className="py-12 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No notices yet.</p>
          </li>
        )}
        {notices.map((n) => (
          <li key={n.id} className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${n.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{n.isActive ? "ON BOARD" : "HIDDEN"}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_STYLE[n.priority] ?? PRIORITY_STYLE.NORMAL}`}>{n.priority}</span>
                {n.attachmentUrl && <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><FileText className="w-3 h-3" /> PDF</span>}
                <span className="text-[10px] text-slate-400">{n.date}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 break-words">{n.title}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{n.content}</p>
              <p className="text-[11px] text-slate-400">edited {new Date(n.updatedAt).toLocaleString()}{n.updatedBy ? ` by ${n.updatedBy}` : ""}</p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:w-32 shrink-0">
              <button type="button" disabled={busyId !== null} onClick={() => setEditing({ id: n.id, title: n.title, content: n.content, priority: n.priority, author: n.author, attachmentUrl: n.attachmentUrl })} className={ghost}>Edit</button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void act(n, { isActive: !n.isActive }, n.isActive ? `"${n.title}" hidden.` : `"${n.title}" is back on the board.`)}
                className={n.isActive ? ghost : primary}
              >
                {n.isActive ? "Hide" : "Show"}
              </button>
              {n.isActive && (
                <Link href={`/notices/${n.id}`} target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
              )}
              <button type="button" disabled={busyId !== null} onClick={() => void act(n, null, `"${n.title}" deleted.`)} className={danger}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <Editor
          draft={editing}
          priorities={priorities}
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
