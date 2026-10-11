"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";

interface LogEntry {
  id: string;
  createdAt: string;
  category: string;
  action: string;
  status: "SUCCESS" | "FAILURE";
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
}

const input = "w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-emerald-600";
const ghostButton = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

const CATEGORY_STYLE: Record<string, string> = {
  AUTH: "bg-sky-100 text-sky-900",
  ACCOUNT: "bg-slate-100 text-slate-800",
  VERIFY: "bg-teal-100 text-teal-900",
  ADMIN: "bg-emerald-100 text-emerald-900",
  EVENT: "bg-indigo-100 text-indigo-900",
  PAYMENT: "bg-amber-100 text-amber-900",
  SMS: "bg-lime-100 text-lime-900",
  CONTENT: "bg-violet-100 text-violet-900",
  SECURITY: "bg-rose-100 text-rose-900",
  SYSTEM: "bg-zinc-200 text-zinc-800",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

export default function AdminLogsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/logs?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to load the activity log (${res.status})`);
      setEntries(data.entries);
      setCategories(data.categories);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the activity log");
    } finally {
      setLoading(false);
    }
  }, [page, query, category, status]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Activity Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every sign-in, join, verification code, admin decision, payment and message send — who, what, when and from where.
          </p>
        </div>
        <button onClick={() => void load()} disabled={loading} className={ghostButton} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
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
            placeholder="Search summary, action, email, IP or ID"
            aria-label="Search the activity log"
            className="w-full text-base sm:text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select aria-label="Filter by category" className={`${input} sm:w-40`} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </select>
          <select aria-label="Filter by outcome" className={`${input} sm:w-36`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        {!loading && entries.length === 0 && <p className="py-10 text-center text-slate-400 text-xs">No activity matches.</p>}
        {entries.map((e) => {
          const open = openId === e.id;
          return (
            <div key={e.id} className={e.status === "FAILURE" ? "bg-rose-50/40" : ""}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : e.id)}
                aria-expanded={open}
                className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50/70"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${CATEGORY_STYLE[e.category] ?? "bg-slate-100 text-slate-800"}`}>{e.category}</span>
                    {e.status === "FAILURE" && <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-600 text-white">FAILED</span>}
                    <span className="text-[10px] font-mono text-slate-400">{e.action}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-900 break-words">{e.summary}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatTime(e.createdAt)}
                    {e.actorEmail ? ` · ${e.actorEmail}` : ""}
                    {e.actorRole ? ` (${e.actorRole})` : ""}
                    {e.ip ? ` · ${e.ip}` : ""}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 mt-1 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <dl className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                  {e.targetType && (
                    <>
                      <dt className="font-bold text-slate-500">Target</dt>
                      <dd className="font-mono text-slate-800 break-all">{e.targetType}{e.targetId ? ` · ${e.targetId}` : ""}</dd>
                    </>
                  )}
                  {e.actorId && (
                    <>
                      <dt className="font-bold text-slate-500">User ID</dt>
                      <dd className="font-mono text-slate-800 break-all">{e.actorId}</dd>
                    </>
                  )}
                  {e.userAgent && (
                    <>
                      <dt className="font-bold text-slate-500">Browser</dt>
                      <dd className="text-slate-700 break-words">{e.userAgent}</dd>
                    </>
                  )}
                  {e.metadata !== null && e.metadata !== undefined && (
                    <>
                      <dt className="font-bold text-slate-500">Details</dt>
                      <dd>
                        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 overflow-x-auto text-[11px] text-slate-800 whitespace-pre-wrap break-words">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </dd>
                    </>
                  )}
                  <dt className="font-bold text-slate-500">Entry ID</dt>
                  <dd className="font-mono text-slate-400 break-all">{e.id}</dd>
                </dl>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total === 0 ? "0 entries" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Newer entries" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className={ghostButton}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold">{page} / {pages}</span>
          <button type="button" aria-label="Older entries" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className={ghostButton}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
