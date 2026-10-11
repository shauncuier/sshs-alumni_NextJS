"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Briefcase, CheckCircle2, ExternalLink, RefreshCw, Trash2, X } from "lucide-react";

interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  workplaceType: string;
  description: string;
  deadline: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED";
  postedByName: string;
  postedByEmail: string;
  postedByBatch: number | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  createdAt: string;
  applications: number;
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Waiting for review" },
  { value: "APPROVED", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];
const BADGE: Record<AdminJob["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  CLOSED: "bg-slate-200 text-slate-700",
};
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/api/admin/jobs${filter ? `?status=${filter}` : ""}`, "GET");
      setJobs(data.jobs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const act = async (job: AdminJob, action: "APPROVE" | "REJECT" | "CLOSE" | "DELETE") => {
    let reason: string | null = null;
    if (action === "REJECT") {
      reason = window.prompt(`Why is "${job.title}" not approved? ${job.postedByName} will see this.`);
      if (!reason || !reason.trim()) return;
    }
    if (action === "DELETE" && !window.confirm(`Delete "${job.title}" and its ${job.applications} application(s)? This cannot be undone.`)) return;
    if (action === "CLOSE" && !window.confirm(`Close "${job.title}"? It stops taking applications.`)) return;
    setBusyId(job.id);
    setError(null);
    try {
      if (action === "DELETE") await api(`/api/admin/jobs/${job.id}`, "DELETE");
      else await api(`/api/jobs/${job.id}`, "PATCH", { action, reason });
      setNotice(
        action === "APPROVE" ? `"${job.title}" is live on the Career Hub.` : action === "REJECT" ? `"${job.title}" was not approved.` : action === "CLOSE" ? `"${job.title}" closed.` : `"${job.title}" deleted.`
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = jobs.filter((j) => j.status === "PENDING").length;

  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Jobs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Members&apos; job posts wait here for approval before they appear on /careers.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filter === f.value ? "bg-emerald-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {f.label}
            {f.value === "PENDING" && !filter && pendingCount > 0 ? ` (${pendingCount})` : ""}
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
        {!loading && jobs.length === 0 && (
          <div className="py-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No jobs here.</p>
          </div>
        )}
        {jobs.map((j) => (
          <div key={j.id} className={`p-4 flex flex-col lg:flex-row gap-3 ${j.status === "PENDING" ? "bg-amber-50/40" : ""}`}>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE[j.status]}`}>{j.status}</span>
                <span className="text-[11px] text-slate-500">{j.jobType} · {j.workplaceType} · deadline {new Date(j.deadline).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 break-words">{j.title} — {j.company}</p>
              <p className="text-xs text-slate-500">{j.location}</p>
              <details>
                <summary className="text-[11px] font-bold text-emerald-800 cursor-pointer">Description</summary>
                <p className="text-xs text-slate-700 whitespace-pre-line mt-1">{j.description}</p>
              </details>
              <p className="text-[11px] text-slate-500 break-all">
                Posted by {j.postedByName}{j.postedByBatch ? ` (SSC ${j.postedByBatch})` : ""} · {j.postedByEmail} · {new Date(j.createdAt).toLocaleString()}
              </p>
              {j.reviewedBy && <p className="text-[11px] text-slate-400">Reviewed by {j.reviewedBy}{j.rejectReason ? ` — ${j.rejectReason}` : ""}</p>}
              <p className="text-[11px] text-slate-500">{j.applications} application{j.applications === 1 ? "" : "s"}</p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:w-36 shrink-0">
              {j.status === "PENDING" && (
                <button type="button" disabled={busyId !== null} onClick={() => void act(j, "APPROVE")} className={primary}><CheckCircle2 className="w-4 h-4" /> Approve</button>
              )}
              {(j.status === "PENDING" || j.status === "APPROVED") && (
                <button type="button" disabled={busyId !== null} onClick={() => void act(j, "REJECT")} className={`${ghost} text-rose-700 border-rose-200`}>Reject</button>
              )}
              {j.status === "APPROVED" && (
                <>
                  <Link href={`/careers/${j.id}`} target="_blank" className={ghost}><ExternalLink className="w-3.5 h-3.5" /> View</Link>
                  <button type="button" disabled={busyId !== null} onClick={() => void act(j, "CLOSE")} className={ghost}>Close</button>
                </>
              )}
              <button type="button" disabled={busyId !== null} onClick={() => void act(j, "DELETE")} className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
