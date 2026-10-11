"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, ImagePlus, Loader2, Newspaper, Plus, RefreshCw, Star, Trash2, X } from "lucide-react";

interface Article {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  author: string;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

type Draft = Omit<Article, "id" | "publishedAt" | "updatedAt" | "updatedBy"> & { id?: string };

const EMPTY: Draft = { title: "", category: "Alumni News", excerpt: "", content: "", featuredImage: null, author: "SSGHS Alumni Association", isPublished: false, isFeatured: false };
const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function Editor({ draft, categories, onClose, onSaved }: { draft: Draft; categories: string[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((f) => ({ ...f, [key]: value }));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      set("featuredImage", data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (publish: boolean) => {
    setError(null);
    setSaving(true);
    try {
      const body = { ...form, isPublished: publish };
      if (form.id) await api(`/api/admin/news/${form.id}`, "PATCH", body);
      else await api("/api/admin/news", "POST", body);
      onSaved(publish ? `"${form.title}" is live on /news.` : `"${form.title}" saved as a draft.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={form.id ? "Edit article" : "New article"}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{form.id ? "Edit article" : "New article"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label htmlFor="news-title" className={label}>Title *</label>
          <input id="news-title" className={input} value={form.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="news-category" className={label}>Category *</label>
            <select id="news-category" className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="news-author" className={label}>Author</label>
            <input id="news-author" className={input} value={form.author} maxLength={120} onChange={(e) => set("author", e.target.value)} />
          </div>
        </div>

        <div>
          <span className={label}>Image</span>
          <div className="flex items-center gap-3">
            <div className="w-32 h-20 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
              {form.featuredImage ? <img src={form.featuredImage} alt="Article image" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
            </div>
            <div className="space-y-1.5">
              <label className={`${ghost} w-fit`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                {form.featuredImage ? "Replace image" : "Upload image"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
              </label>
              {form.featuredImage && (
                <button type="button" onClick={() => set("featuredImage", null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove image</button>
              )}
              <p className="text-[11px] text-slate-500">JPEG, PNG or WebP, up to 8 MB. Location and camera data are removed.</p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="news-excerpt" className={label}>Summary (shown on the news list)</label>
          <textarea id="news-excerpt" rows={2} maxLength={400} className={input} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Leave empty to use the first paragraph" />
        </div>
        <div>
          <label htmlFor="news-content" className={label}>Article *</label>
          <textarea id="news-content" rows={12} className={`${input} leading-relaxed`} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Write the article. Leave an empty line between paragraphs." />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="rounded text-emerald-700" />
          Feature this article (shown first)
        </label>

        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button type="button" disabled={saving || uploading} onClick={() => void save(false)} className={ghost}>
            {form.isPublished ? "Unpublish & save as draft" : "Save draft"}
          </button>
          <button type="button" disabled={saving || uploading} onClick={() => void save(true)} className={primary}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.isPublished ? "Save & keep published" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/admin/news", "GET");
      setArticles(data.articles);
      setCategories(data.categories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const act = async (a: Article, body: Record<string, unknown> | null, message: string) => {
    if (!body && !window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setBusyId(a.id);
    setError(null);
    try {
      await api(`/api/admin/news/${a.id}`, body ? "PATCH" : "DELETE", body ?? undefined);
      setNotice(message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">News</h1>
          <p className="text-xs text-slate-500 mt-0.5">Write, publish and feature news. Drafts are only visible here.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setEditing({ ...EMPTY, category: categories[1] ?? EMPTY.category })} className={`${primary} flex-1 sm:flex-none`}>
            <Plus className="w-4 h-4" /> New article
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && articles.length === 0 && (
          <div className="py-12 text-center">
            <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No articles yet. Write the first one.</p>
          </div>
        )}
        {articles.map((a) => (
          <div key={a.id} className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-32 h-32 sm:h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
              {a.featuredImage && <img src={a.featuredImage.replace("/large.webp", "/thumb.webp")} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {a.isPublished ? "PUBLISHED" : "DRAFT"}
                </span>
                {a.isFeatured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 flex items-center gap-1"><Star className="w-3 h-3" /> FEATURED</span>
                )}
                <span className="text-[10px] text-slate-400">{a.category}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 break-words">{a.title}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{a.excerpt}</p>
              <p className="text-[11px] text-slate-400">
                {a.isPublished ? `Published ${new Date(a.publishedAt).toLocaleDateString()}` : "Not published"} · edited {new Date(a.updatedAt).toLocaleString()}
                {a.updatedBy ? ` by ${a.updatedBy}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:w-36 shrink-0">
              <button type="button" disabled={busyId !== null} onClick={() => setEditing(a)} className={ghost}>Edit</button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void act(a, { isPublished: !a.isPublished }, a.isPublished ? `"${a.title}" unpublished.` : `"${a.title}" is live.`)}
                className={a.isPublished ? ghost : primary}
              >
                {a.isPublished ? "Unpublish" : "Publish"}
              </button>
              {a.isPublished && (
                <Link href={`/news/${a.id}`} target="_blank" className={ghost}>
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </Link>
              )}
              <button type="button" disabled={busyId !== null} onClick={() => void act(a, null, `"${a.title}" deleted.`)} className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Editor
          draft={editing}
          categories={categories}
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
