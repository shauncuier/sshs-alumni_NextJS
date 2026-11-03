"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, EyeOff, GraduationCap, Home, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api, Banners, danger, Dialog, Field, ghost, ImageField, input, label, primary } from "@/components/admin/content-kit";
import { PERSON_PLACEHOLDER } from "@/components/shared/PersonCard";
import { PERSON_KINDS, PERSON_STATUSES, isShown, type SchoolPersonView } from "@/lib/teachers-shared";

interface Draft {
  id?: string;
  kind: SchoolPersonView["kind"];
  status: SchoolPersonView["status"];
  nameBn: string;
  nameEn: string;
  roleBn: string;
  roleEn: string;
  tenure: string;
  photoUrl: string | null;
  note: string;
  onHomePage: boolean;
  isPublished: boolean;
}

const EMPTY: Draft = { kind: "TEACHER", status: "CURRENT", nameBn: "", nameEn: "", roleBn: "সহকারী শিক্ষক", roleEn: "Assistant teacher", tenure: "", photoUrl: null, note: "", onHomePage: false, isPublished: true };

const toDraft = (p: SchoolPersonView): Draft => ({
  id: p.id,
  kind: p.kind,
  status: p.status,
  nameBn: p.nameBn,
  nameEn: p.nameEn ?? "",
  roleBn: p.roleBn ?? "",
  roleEn: p.roleEn ?? "",
  tenure: p.tenure ?? "",
  photoUrl: p.photoUrl,
  note: p.note ?? "",
  onHomePage: p.onHomePage,
  isPublished: p.isPublished,
});

const STATUS_STYLE: Record<SchoolPersonView["status"], string> = {
  CURRENT: "bg-emerald-50 text-emerald-800 border-emerald-200",
  FORMER: "bg-slate-50 text-slate-700 border-slate-200",
  LATE: "bg-violet-50 text-violet-800 border-violet-200",
  UNKNOWN: "bg-amber-50 text-amber-800 border-amber-300",
};

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
      if (id) await api(`/api/admin/teachers/${id}`, "PATCH", body);
      else await api("/api/admin/teachers", "POST", body);
      onSaved(`${form.nameEn || form.nameBn} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={form.id ? "Edit person" : "Add a person"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="t-kind" className={label}>Group *</label>
          <select id="t-kind" className={input} value={form.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])}>
            {PERSON_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="t-status" className={label}>Status *</label>
          <select id="t-status" className={input} value={form.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
            {PERSON_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="t-name-bn" title="Name in Bangla" required value={form.nameBn} max={200} onChange={(v) => set("nameBn", v)} placeholder="জনাব …" />
        <Field id="t-name-en" title="Name in English" value={form.nameEn} max={200} onChange={(v) => set("nameEn", v)} />
        <Field id="t-role-bn" title="Post in Bangla" value={form.roleBn} max={200} onChange={(v) => set("roleBn", v)} placeholder="সহকারী শিক্ষক" />
        <Field id="t-role-en" title="Post in English" value={form.roleEn} max={200} onChange={(v) => set("roleEn", v)} placeholder="Assistant teacher" />
      </div>
      {form.status === "LATE" && <p className="text-[11px] text-slate-500 -mt-1">For someone who has passed away, write মরহুম or প্রয়াত before the Bangla name.</p>}
      <Field id="t-tenure" title="Years at the school" value={form.tenure} max={100} onChange={(v) => set("tenure", v)} placeholder="1980 – 2004" />
      <ImageField title="Photo" hint="Passport-style photo, JPEG, PNG or WebP, up to 8 MB." portrait value={form.photoUrl} onChange={(url) => set("photoUrl", url)} onError={setError} onBusy={setUploading} />
      <Field id="t-note" title="Note for admins (not shown on the site)" value={form.note} max={500} onChange={(v) => set("note", v)} placeholder="Where this came from, or what to check" />
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="w-4 h-4 accent-emerald-700" />
          Show on the website
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.onHomePage} onChange={(e) => set("onHomePage", e.target.checked)} className="w-4 h-4 accent-emerald-700" />
          Also show in the home page&apos;s &quot;With gratitude&quot; panel
        </label>
      </div>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <button type="button" disabled={saving || uploading} onClick={() => void save()} className={`${primary} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
      </button>
    </Dialog>
  );
}

export default function AdminTeachersPage() {
  const [people, setPeople] = useState<SchoolPersonView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPeople((await api("/api/admin/teachers", "GET")).people);
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

  const unknownCount = people.filter((p) => p.status === "UNKNOWN" && p.kind !== "FOUNDER").length;
  const groups = useMemo(
    () => PERSON_KINDS.map((k) => ({ ...k, people: people.filter((p) => p.kind === k.value && (!onlyUnknown || p.status === "UNKNOWN")) })).filter((g) => g.people.length > 0),
    [people, onlyUnknown],
  );

  // Swap two people inside one group, then number the group 1..n.
  const move = (list: SchoolPersonView[], index: number, delta: number) => {
    const other = index + delta;
    if (other < 0 || other >= list.length) return;
    const next = [...list];
    [next[index], next[other]] = [next[other], next[index]];
    void run(() => Promise.all(next.map((p, i) => (p.sortOrder === i + 1 ? null : api(`/api/admin/teachers/${p.id}`, "PATCH", { sortOrder: i + 1 })))), "Order saved.");
  };

  const setStatus = (p: SchoolPersonView, status: SchoolPersonView["status"]) =>
    void run(() => api(`/api/admin/teachers/${p.id}`, "PATCH", { status }), `${p.nameEn || p.nameBn}: status saved.`);

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Teachers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Founders, head teachers, teachers and office staff on /school and the home page.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/teachers" target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
          <button onClick={() => setEditing(EMPTY)} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> Add person
          </button>
        </div>
      </div>

      <Banners error={error} notice={notice} onDismiss={() => setNotice(null)} />

      {unknownCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-amber-900">
            <span className="font-bold">{unknownCount} {unknownCount === 1 ? "person has" : "people have"} no status yet</span> and {unknownCount === 1 ? "is" : "are"} hidden from the website until you set one.
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
            <input type="checkbox" checked={onlyUnknown} onChange={(e) => setOnlyUnknown(e.target.checked)} className="w-4 h-4 accent-amber-600" />
            Show only them
          </label>
        </div>
      )}

      {!loading && people.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 py-12 text-center">
          <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No one yet.</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.value} className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-emerald-800">
            {g.label} <span lang="bn" className="font-semibold text-slate-500 normal-case">· {g.labelBn}</span> <span className="text-slate-400">({g.people.length})</span>
          </h2>
          <ul className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {g.people.map((p, i) => (
              <li key={p.id} className={`p-3 sm:px-5 flex flex-wrap sm:flex-nowrap items-center gap-3 ${isShown(p) ? "" : "opacity-70"}`}>
                <img loading="lazy" decoding="async" src={p.photoUrl ?? PERSON_PLACEHOLDER} alt="" className="w-11 h-13 rounded-lg object-cover object-top bg-emerald-50 border border-slate-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p lang="bn" className="text-sm font-bold text-slate-900 truncate">{p.nameBn}</p>
                  <p className="text-[11px] text-slate-500 truncate">{[p.nameEn, p.roleEn || p.roleBn, p.tenure].filter(Boolean).join(" · ")}</p>
                  <p className="text-[10px] font-bold flex flex-wrap items-center gap-2 mt-0.5">
                    {!p.isPublished && <span className="text-slate-500 flex items-center gap-0.5"><EyeOff className="w-3 h-3" /> hidden</span>}
                    {p.onHomePage && <span className="text-emerald-700 flex items-center gap-0.5"><Home className="w-3 h-3" /> home page</span>}
                    {p.note && <span className="font-normal text-slate-400 truncate max-w-[18rem]" title={p.note}>{p.note}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto">
                  <select
                    aria-label={`Status of ${p.nameEn || p.nameBn}`}
                    disabled={busy}
                    value={p.status}
                    onChange={(e) => setStatus(p, e.target.value as SchoolPersonView["status"])}
                    className={`text-xs font-bold rounded-lg border px-2 py-1.5 flex-1 sm:flex-none ${STATUS_STYLE[p.status]}`}
                  >
                    {PERSON_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.value === "UNKNOWN" ? "Not known" : s.label.split(" (")[0]}</option>
                    ))}
                  </select>
                  {!onlyUnknown && (
                    <>
                      <button type="button" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(g.people, i, -1)} className={`${ghost} px-2`}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button type="button" aria-label="Move down" disabled={busy || i === g.people.length - 1} onClick={() => move(g.people, i, 1)} className={`${ghost} px-2`}><ArrowDown className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  <button type="button" disabled={busy} onClick={() => setEditing(toDraft(p))} className={ghost}>Edit</button>
                  <button
                    type="button"
                    aria-label={`Remove ${p.nameEn || p.nameBn}`}
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${p.nameEn || p.nameBn} from the list?`)) void run(() => api(`/api/admin/teachers/${p.id}`, "DELETE"), `${p.nameEn || p.nameBn} removed.`);
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
