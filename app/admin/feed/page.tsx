"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, ClipboardCopy, Copy, RefreshCw, Search } from "lucide-react";
import { Toast, useToast } from "@/components/admin/Toast";
import { magazineDate, magazineText, postText, type MagazinePost } from "@/lib/magazine-text";

const input = "w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-600";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const primary = "px-4 py-2 min-h-[40px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

/** Puts text on the clipboard; falls back to a hidden textarea where the Clipboard API is unavailable (plain http). */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the textarea trick.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  if (!ok) throw new Error("Copying is not available in this browser. Select the text and copy it by hand.");
}

export default function AdminFeedMagazinePage() {
  const [posts, setPosts] = useState<MagazinePost[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  // Search on the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set("q", query);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/feed?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to load the posts (${res.status})`);
      setPosts(data.posts);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the posts");
    } finally {
      setLoading(false);
    }
  }, [page, query, from, to]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const copyOne = async (post: MagazinePost) => {
    try {
      await copyText(postText(post));
      setCopiedId(post.id);
      showToast(`Copied ${post.authorName}'s post.`);
      window.setTimeout(() => setCopiedId((id) => (id === post.id ? null : id)), 2000);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const copyAll = async () => {
    try {
      await copyText(magazineText(posts));
      showToast(`Copied ${posts.length} ${posts.length === 1 ? "post" : "posts"} as plain text.`);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const shownFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const shownTo = Math.min(total, page * pageSize);

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-5xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Text for the paper magazine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Members&apos; feed posts as plain text, ready to paste into the magazine layout. Pick the dates, search, then copy one post or everything shown.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button type="button" onClick={() => void copyAll()} disabled={loading || posts.length === 0} className={primary}>
            <ClipboardCopy className="w-4 h-4" />
            <span>Copy all shown{posts.length > 0 ? ` (${posts.length})` : ""}</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white px-3 rounded-2xl border border-slate-200 shadow-xs min-h-[44px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the text or the author"
            aria-label="Search posts"
            className="w-full text-base sm:text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <label className="block">
            <span className="sr-only">Posted from</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="Posted from" title="Posted from" className={`${input} sm:w-40`} />
          </label>
          <label className="block">
            <span className="sr-only">Posted until</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="Posted until" title="Posted until" className={`${input} sm:w-40`} />
          </label>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        {loading ? "Loading posts…" : total === 0 ? "No posts match." : `Showing ${shownFrom}–${shownTo} of ${total} ${total === 1 ? "post" : "posts"}, newest first.`}
      </p>

      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 break-words">
                  {post.authorName}
                  {(post.batchTag ?? post.authorBatch) && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200 align-middle">SSC {post.batchTag ?? post.authorBatch}</span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {magazineDate(post.createdAt)}
                  {post.editedAt ? ` · edited ${magazineDate(post.editedAt)}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => void copyOne(post)} className={`${ghost} shrink-0`} aria-label={`Copy ${post.authorName}'s post`}>
                {copiedId === post.id ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId === post.id ? "Copied" : "Copy text"}</span>
              </button>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">{post.content}</p>
          </article>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className={ghost}>
            <ChevronLeft className="w-4 h-4" /> Newer
          </button>
          <span>Page {page} of {pages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages || loading} className={ghost}>
            Older <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
