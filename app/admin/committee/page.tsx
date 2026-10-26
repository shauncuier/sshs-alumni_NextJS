"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Landmark, Loader2, Plus, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, ImageField, input, label, primary } from "@/components/admin/content-kit";

interface Member {
  id: string;
  termId: string;
  name: string;
  post: string;
  lifeMemberNo: string | null;
  sscBatch: number | null;
  phone: string | null;
  facebookUrl: string | null;
  photoUrl: string | null;
  note: string | null;
  sortOrder: number;
}

interface Term {
  id: string;
  title: string;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  imageUrl: string | null;
  sortOrder: number;
  members: Member[];
}

interface TermDraft {
  id?: string;
  title: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
  imageUrl: string | null;
}

interface MemberDraft {
  id?: string;
  termId: string;
  name: string;
  post: string;
  lifeMemberNo: string;
  sscBatch: string;
  phone: string;
  facebookUrl: string;
  photoUrl: string | null;
  note: string;
}

const years = (t: Term) => (t.endYear ? `${t.startYear}–${t.endYear}` : `${t.startYear}–`);

function TermEditor({ draft, onClose, onSaved }: { draft: TermDraft; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TermDraft>(key: K, value: TermDraft[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const body = { title: form.title, startYear: form.startYear, endYear: form.endYear, isCurrent: form.isCurrent, imageUrl: form.imageUrl };
      if (form.id) await api(`/api/admin/committee/${form.id}`, "PATCH", body);
      else await api("/api/admin/committee", "POST", body);
      onSaved(`"${form.title}" saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit committee term" : "New committee term"} onClose={onClose}>
      <Field id="term-title" title="Title" required value={form.title} max={200} onChange={(v) => set("title", v)} placeholder="Executive Committee 2025–2027" />
      <div className="grid grid-cols-2 gap-3">
        <Field id="term-start" title="Start year" required numeric value={form.startYear} max={4} onChange={(v) => set("startYear", v)} />
        <Field id="term-end" title="End year" numeric value={form.endYear} max={4} onChange={(v) => set("endYear", v)} placeholder="Leave empty if ongoing" />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={form.isCurrent} onChange={(e) => set("isCurrent", e.target.checked)} className="rounded text-emerald-700" />
        This is the current committee (shown on /committee; any other current term moves to past committees)
      </label>
      <ImageField
        title="Group photo or scanned list (shown for past committees)"
        value={form.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        onError={setError}
        onBusy={setUploading}
      />
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save term
      </button>
    </Dialog>
  );
}

function MemberEditor({ draft, onClose, onSaved }: { draft: MemberDraft; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof MemberDraft>(key: K, value: MemberDraft[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const { id, ...body } = form;
      if (id) await api(`/api/admin/committee/members/${id}`, "PATCH", body);
      else await api("/api/admin/committee/members", "POST", body);
      onSaved(`${form.name} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit committee member" : "Add committee member"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="m-name" title="Name" required value={form.name} max={200} onChange={(v) => set("name", v)} />
        <Field id="m-post" title="Post" required value={form.post} max={200} onChange={(v) => set("post", v)} placeholder="President, General Secretary, Member…" />
        <Field id="m-lm" title="Life member no." value={form.lifeMemberNo} max={40} onChange={(v) => set("lifeMemberNo", v)} />
        <Field id="m-batch" title="SSC batch" numeric value={form.sscBatch} max={4} onChange={(v) => set("sscBatch", v)} />
        <Field id="m-phone" title="Phone (shown publicly)" value={form.phone} max={40} onChange={(v) => set("phone", v)} placeholder="01XXXXXXXXX" />
        <Field id="m-fb" title="Facebook link" value={form.facebookUrl} max={500} onChange={(v) => set("facebookUrl", v)} placeholder="https://facebook.com/…" />
      </div>
      <Field id="m-note" title="Extra line" value={form.note} max={300} onChange={(v) => set("note", v)} placeholder="e.g. Head teacher (ex officio)" />
      <ImageField title="Photo" portrait value={form.photoUrl} onChange={(url) => set("photoUrl", url)} onError={setError} onBusy={setUploading} />
      <p className="text-[11px] text-slate-500">Without a photo, a placeholder is shown.</p>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save member
      </button>
    </Dialog>
  );
}

function PresidentMessage({ initial, onSaved, onError }: { initial: string; onSaved: (message: string) => void; onError: (message: string) => void }) {
  const [message, setMessage] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/president-message", "PUT", { message });
      onSaved(message.trim() ? "The President's message is on the home page." : "The President's message is hidden.");
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
      <div>
        <h2 className="text-sm font-black text-slate-900">Message from the President</h2>
        <p className="text-xs text-slate-500">Shown on the home page with the photo and name of the current committee&apos;s President. Leave empty to hide it.</p>
      </div>
      <label htmlFor="president-message" className={label}>Message</label>
      <textarea id="president-message" rows={6} maxLength={8000} className={`${input} leading-relaxed`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave an empty line between paragraphs." />
      <button type="button" disabled={saving} onClick={() => void save()} className={`${primary} w-full sm:w-auto`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save message
      </button>
    </div>
  );
}

export default function AdminCommitteePage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [presidentMessage, setPresidentMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<TermDraft | null>(null);
  const [editingMember, setEditingMember] = useState<MemberDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/admin/committee", "GET");
      setTerms(data.terms);
      setPresidentMessage((m) => m ?? data.presidentMessage.message);
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

  // Swaps a member with its neighbour by giving each a fresh position.
  const move = (term: Term, index: number, delta: number) => {
    const other = index + delta;
    if (other < 0 || other >= term.members.length) return;
    const list = [...term.members];
    [list[index], list[other]] = [list[other], list[index]];
    void run(
      () => Promise.all(list.map((m, i) => (m.sortOrder === i + 1 ? null : api(`/api/admin/committee/members/${m.id}`, "PATCH", { sortOrder: i + 1 })))),
      "Order saved."
    );
  };

  const newMember = (termId: string): MemberDraft => ({ termId, name: "", post: "", lifeMemberNo: "", sscBatch: "", phone: "", facebookUrl: "", photoUrl: null, note: "" });
  const editMember = (m: Member): MemberDraft => ({
    id: m.id,
    termId: m.termId,
    name: m.name,
    post: m.post,
    lifeMemberNo: m.lifeMemberNo ?? "",
    sscBatch: m.sscBatch ? String(m.sscBatch) : "",
    phone: m.phone ?? "",
    facebookUrl: m.facebookUrl ?? "",
    photoUrl: m.photoUrl,
    note: m.note ?? "",
  });

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Executive Committee</h1>
          <p className="text-xs text-slate-500 mt-0.5">The current committee is listed on /committee; older terms on /committee/past.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/committee" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button
            onClick={() => setEditingTerm({ title: "", startYear: String(new Date().getFullYear()), endYear: "", isCurrent: terms.length === 0, imageUrl: null })}
            className={`${primary} flex-1 sm:flex-none`}
          >
            <Plus className="w-4 h-4" /> New term
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      {presidentMessage !== null && <PresidentMessage initial={presidentMessage} onSaved={setNotice} onError={setError} />}

      {!loading && terms.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 py-12 text-center">
          <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No committee yet. Add the current term, then its members.</p>
        </div>
      )}

      {terms.map((t) => (
        <section key={t.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-slate-100">
            {t.imageUrl && <img loading="lazy" decoding="async" src={t.imageUrl.replace("/large.webp", "/thumb.webp")} alt="" className="w-full sm:w-28 h-28 sm:h-16 rounded-xl object-cover bg-slate-100" />}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.isCurrent ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {t.isCurrent ? "CURRENT" : "PAST"}
                </span>
                <span className="text-[11px] text-slate-500">{years(t)} · {t.members.length} members</span>
              </div>
              <p className="text-sm font-bold text-slate-900 break-words mt-1">{t.title}</p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
              <button type="button" disabled={busy} onClick={() => setEditingMember(newMember(t.id))} className={primary}><UserPlus className="w-4 h-4" /> Member</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditingTerm({ id: t.id, title: t.title, startYear: String(t.startYear), endYear: t.endYear ? String(t.endYear) : "", isCurrent: t.isCurrent, imageUrl: t.imageUrl })}
                className={ghost}
              >
                Edit
              </button>
              {!t.isCurrent && (
                <button type="button" disabled={busy} onClick={() => void run(() => api(`/api/admin/committee/${t.id}`, "PATCH", { isCurrent: true }), `"${t.title}" is now the current committee.`)} className={ghost}>
                  Make current
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete "${t.title}" and its ${t.members.length} members? This cannot be undone.`)) {
                    void run(() => api(`/api/admin/committee/${t.id}`, "DELETE"), `"${t.title}" deleted.`);
                  }
                }}
                className={danger}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {t.members.length === 0 && <li className="p-4 text-xs text-slate-500">No members listed{t.isCurrent ? "; /committee shows a “being finalised” note." : "."}</li>}
            {t.members.map((m, i) => (
              <li key={m.id} className="p-3 sm:px-5 flex items-center gap-3">
                <img loading="lazy" decoding="async" src={m.photoUrl ?? "/placeholders/person.svg"} alt="" className="w-10 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {m.post}
                    {m.lifeMemberNo ? ` · LM ${m.lifeMemberNo}` : ""}
                    {m.sscBatch ? ` · SSC ${m.sscBatch}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(t, i, -1)} className={`${ghost} px-2`}><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label="Move down" disabled={busy || i === t.members.length - 1} onClick={() => move(t, i, 1)} className={`${ghost} px-2`}><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={busy} onClick={() => setEditingMember(editMember(m))} className={ghost}>Edit</button>
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${m.name} from "${t.title}"?`)) void run(() => api(`/api/admin/committee/members/${m.id}`, "DELETE"), `${m.name} removed.`);
                    }}
                    className={`${danger} px-2`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editingTerm && (
        <TermEditor
          draft={editingTerm}
          onClose={() => setEditingTerm(null)}
          onSaved={(message) => {
            setEditingTerm(null);
            setNotice(message);
            void load();
          }}
        />
      )}
      {editingMember && (
        <MemberEditor
          draft={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(message) => {
            setEditingMember(null);
            setNotice(message);
            void load();
          }}
        />
      )}
    </div>
  );
}
