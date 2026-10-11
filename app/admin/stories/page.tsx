"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Award, BookOpen, ExternalLink, ImagePlus, Loader2, Plus, RefreshCw, Star, Trash2, X } from "lucide-react";

interface Story {
  id: string;
  title: string;
  authorName: string;
  batchYear: number;
  profession: string;
  currentOrganization: string | null;
  coverImage: string | null;
  summary: string;
  fullStory: string;
  quote: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

interface Achievement {
  id: string;
  recipientName: string;
  batchYear: number;
  category: string;
  title: string;
  organization: string;
  description: string;
  photoUrl: string | null;
  yearAwarded: number;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const thumb = (url: string | null) => (url ? url.replace("/large.webp", "/thumb.webp") : null);
const thisYear = new Date().getFullYear();

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ImageField({ value, onChange, round }: { value: string | null; onChange: (url: string | null) => void; round?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`${round ? "w-20 h-20 rounded-full" : "w-32 h-20 rounded-xl"} border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center`}>
        {value ? <img src={thumb(value)!} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
      </div>
      <div className="space-y-1.5">
        <label className={`${ghost} w-fit`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {value ? "Replace" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {value && <button type="button" onClick={() => onChange(null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>}
        {error && <p className="text-[11px] font-bold text-rose-700">{error}</p>}
      </div>
    </div>
  );
}

const EMPTY_STORY = { title: "", authorName: "", batchYear: "", profession: "", currentOrganization: "", coverImage: null as string | null, summary: "", fullStory: "", quote: "", isFeatured: false };

function StoryEditor({ story, onClose, onSaved }: { story: Story | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [form, setForm] = useState(
    story
      ? { ...story, batchYear: String(story.batchYear), currentOrganization: story.currentOrganization ?? "", quote: story.quote ?? "" }
      : EMPTY_STORY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, batchYear: Number(form.batchYear), isPublished: publish };
      if (story) await api(`/api/admin/stories/${story.id}`, "PATCH", body);
      else await api("/api/admin/stories", "POST", body);
      onSaved(publish ? `"${form.title}" is live on /stories.` : `"${form.title}" saved as a draft.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={story ? "Edit story" : "New story"} onClose={onClose}>
      <div>
        <label htmlFor="st-title" className={label}>Title *</label>
        <input id="st-title" maxLength={200} className={input} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="st-name" className={label}>Alumnus *</label>
          <input id="st-name" maxLength={120} className={input} value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-batch" className={label}>SSC batch *</label>
          <input id="st-batch" inputMode="numeric" className={input} value={form.batchYear} onChange={(e) => set("batchYear", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="2005" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="st-prof" className={label}>Profession *</label>
          <input id="st-prof" maxLength={120} className={input} value={form.profession} onChange={(e) => set("profession", e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-org" className={label}>Organization</label>
          <input id="st-org" maxLength={200} className={input} value={form.currentOrganization} onChange={(e) => set("currentOrganization", e.target.value)} />
        </div>
      </div>
      <div>
        <span className={label}>Cover image</span>
        <ImageField value={form.coverImage} onChange={(url) => set("coverImage", url)} />
      </div>
      <div>
        <label htmlFor="st-sum" className={label}>Summary</label>
        <textarea id="st-sum" rows={2} maxLength={500} className={input} value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Leave empty to use the first paragraph" />
      </div>
      <div>
        <label htmlFor="st-body" className={label}>Story *</label>
        <textarea id="st-body" rows={12} className={`${input} leading-relaxed`} value={form.fullStory} onChange={(e) => set("fullStory", e.target.value)} placeholder="Leave an empty line between paragraphs." />
      </div>
      <div>
        <label htmlFor="st-quote" className={label}>Quote</label>
        <input id="st-quote" maxLength={500} className={input} value={form.quote} onChange={(e) => set("quote", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="rounded text-emerald-700" />
        Feature this story (shown first)
      </label>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button type="button" disabled={saving} onClick={() => void save(false)} className={ghost}>{story?.isPublished ? "Unpublish & save as draft" : "Save draft"}</button>
        <button type="button" disabled={saving} onClick={() => void save(true)} className={primary}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {story?.isPublished ? "Save & keep published" : "Publish"}
        </button>
      </div>
    </Modal>
  );
}

const EMPTY_ACH = { recipientName: "", batchYear: "", category: "", title: "", organization: "", description: "", photoUrl: null as string | null, yearAwarded: String(thisYear) };

function AchievementEditor({ item, categories, onClose, onSaved }: { item: Achievement | null; categories: string[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [form, setForm] = useState(
    item ? { ...item, batchYear: String(item.batchYear), yearAwarded: String(item.yearAwarded) } : { ...EMPTY_ACH, category: categories[0] ?? "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, batchYear: Number(form.batchYear), yearAwarded: Number(form.yearAwarded), isPublished: publish };
      if (item) await api(`/api/admin/achievements/${item.id}`, "PATCH", body);
      else await api("/api/admin/achievements", "POST", body);
      onSaved(publish ? `${form.recipientName}'s achievement is live.` : "Achievement saved (not published).");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? "Edit achievement" : "New achievement"} onClose={onClose}>
      <div>
        <span className={label}>Photo of the alumnus</span>
        <ImageField value={form.photoUrl} onChange={(url) => set("photoUrl", url)} round />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="ac-name" className={label}>Alumnus *</label>
          <input id="ac-name" maxLength={120} className={input} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ac-batch" className={label}>SSC batch *</label>
          <input id="ac-batch" inputMode="numeric" className={input} value={form.batchYear} onChange={(e) => set("batchYear", e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      <div>
        <label htmlFor="ac-title" className={label}>Achievement or award *</label>
        <input id="ac-title" maxLength={200} className={input} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="ac-org" className={label}>Awarded by *</label>
          <input id="ac-org" maxLength={200} className={input} value={form.organization} onChange={(e) => set("organization", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ac-year" className={label}>Year *</label>
          <input id="ac-year" inputMode="numeric" className={input} value={form.yearAwarded} onChange={(e) => set("yearAwarded", e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      <div>
        <label htmlFor="ac-cat" className={label}>Category *</label>
        <select id="ac-cat" className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="ac-desc" className={label}>Description *</label>
        <textarea id="ac-desc" rows={4} maxLength={3000} className={input} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button type="button" disabled={saving} onClick={() => void save(false)} className={ghost}>{item?.isPublished ? "Unpublish & save" : "Save without publishing"}</button>
        <button type="button" disabled={saving} onClick={() => void save(true)} className={primary}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {item?.isPublished ? "Save & keep published" : "Publish"}
        </button>
      </div>
    </Modal>
  );
}

const statusBadge = (published: boolean) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{published ? "PUBLISHED" : "DRAFT"}</span>
);

export default function AdminStoriesPage() {
  const [tab, setTab] = useState<"stories" | "achievements">("stories");
  const [stories, setStories] = useState<Story[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null | "new">(null);
  const [editingAch, setEditingAch] = useState<Achievement | null | "new">(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a] = await Promise.all([api("/api/admin/stories", "GET"), api("/api/admin/achievements", "GET")]);
      setStories(s.stories);
      setAchievements(a.achievements);
      setCategories(a.categories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const act = async (url: string, method: "PATCH" | "DELETE", body: unknown, message: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(url);
    setError(null);
    try {
      await api(url, method, body ?? undefined);
      setNotice(message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const saved = (message: string) => {
    setEditingStory(null);
    setEditingAch(null);
    setNotice(message);
    void load();
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Stories &amp; Achievements</h1>
          <p className="text-xs text-slate-500 mt-0.5">Alumni stories for /stories and the Hall of Distinction on /achievements. Drafts are only visible here.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={() => (tab === "stories" ? setEditingStory("new") : setEditingAch("new"))} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> {tab === "stories" ? "New story" : "New achievement"}
          </button>
        </div>
      </div>

      <div role="tablist" className="inline-flex bg-white border border-slate-200 rounded-2xl p-1 gap-1">
        {(["stories", "achievements"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${tab === t ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t === "stories" ? <BookOpen className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
            {t === "stories" ? `Stories (${stories.length})` : `Achievements (${achievements.length})`}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
      {notice && (
        <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {tab === "stories" &&
          (!loading && stories.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500">No stories yet. Write the first one.</p>
          ) : (
            stories.map((s) => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-32 h-32 sm:h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">{thumb(s.coverImage) && <img src={thumb(s.coverImage)!} alt="" className="w-full h-full object-cover" />}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {statusBadge(s.isPublished)}
                    {s.isFeatured && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 flex items-center gap-1"><Star className="w-3 h-3" /> FEATURED</span>}
                  </div>
                  <p className="text-sm font-bold text-slate-900 break-words">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.authorName} · SSC {s.batchYear} · {s.profession}</p>
                  <p className="text-[11px] text-slate-400">edited {new Date(s.updatedAt).toLocaleString()}{s.updatedBy ? ` by ${s.updatedBy}` : ""}</p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:w-36 shrink-0">
                  <button type="button" className={ghost} onClick={() => setEditingStory(s)}>Edit</button>
                  <button type="button" disabled={busyId !== null} className={s.isPublished ? ghost : primary} onClick={() => void act(`/api/admin/stories/${s.id}`, "PATCH", { isPublished: !s.isPublished }, s.isPublished ? "Story unpublished." : "Story is live.")}>{s.isPublished ? "Unpublish" : "Publish"}</button>
                  {s.isPublished && <Link href={`/stories/${s.id}`} target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>}
                  <button type="button" disabled={busyId !== null} className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`} onClick={() => void act(`/api/admin/stories/${s.id}`, "DELETE", null, "Story deleted.", `Delete "${s.title}"? This cannot be undone.`)}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            ))
          ))}

        {tab === "achievements" &&
          (!loading && achievements.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500">No achievements yet. Add the first one.</p>
          ) : (
            achievements.map((a) => (
              <div key={a.id} className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0">{thumb(a.photoUrl) && <img src={thumb(a.photoUrl)!} alt="" className="w-full h-full object-cover" />}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">{statusBadge(a.isPublished)}<span className="text-[10px] text-slate-400">{a.category} · {a.yearAwarded}</span></div>
                  <p className="text-sm font-bold text-slate-900 break-words">{a.recipientName} — {a.title}</p>
                  <p className="text-xs text-slate-500">SSC {a.batchYear} · {a.organization}</p>
                </div>
                <div className="grid grid-cols-3 sm:flex sm:flex-col gap-2 sm:w-36 shrink-0">
                  <button type="button" className={ghost} onClick={() => setEditingAch(a)}>Edit</button>
                  <button type="button" disabled={busyId !== null} className={a.isPublished ? ghost : primary} onClick={() => void act(`/api/admin/achievements/${a.id}`, "PATCH", { isPublished: !a.isPublished }, a.isPublished ? "Achievement unpublished." : "Achievement is live.")}>{a.isPublished ? "Unpublish" : "Publish"}</button>
                  <button type="button" disabled={busyId !== null} className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`} onClick={() => void act(`/api/admin/achievements/${a.id}`, "DELETE", null, "Achievement deleted.", `Delete ${a.recipientName}'s "${a.title}"?`)}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            ))
          ))}
      </div>

      {editingStory && <StoryEditor story={editingStory === "new" ? null : editingStory} onClose={() => setEditingStory(null)} onSaved={saved} />}
      {editingAch && <AchievementEditor item={editingAch === "new" ? null : editingAch} categories={categories} onClose={() => setEditingAch(null)} onSaved={saved} />}
    </div>
  );
}
