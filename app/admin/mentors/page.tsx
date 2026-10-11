"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, GraduationCap, RefreshCw, X } from "lucide-react";

interface AdminMentor {
  id: string;
  name: string;
  email: string;
  sscBatch: number | null;
  designation: string;
  organization: string;
  domain: string;
  bio: string;
  topicsOffered: string[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAUSED";
  reviewedBy: string | null;
  rejectReason: string | null;
  createdAt: string;
  menteesHelped: number;
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Waiting for review" },
  { value: "APPROVED", label: "Listed" },
  { value: "PAUSED", label: "Paused" },
  { value: "REJECTED", label: "Rejected" },
];
const BADGE: Record<AdminMentor["status"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-slate-200 text-slate-700",
  REJECTED: "bg-rose-100 text-rose-800",
};
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

export default function AdminMentorsPage() {
  const [mentors, setMentors] = useState<AdminMentor[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mentors${filter ? `?status=${filter}` : ""}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load mentors.");
      setMentors(data.mentors);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const act = async (m: AdminMentor, action: "APPROVE" | "REJECT" | "PAUSE" | "RESUME") => {
    let reason: string | null = null;
    if (action === "REJECT") {
      reason = window.prompt(`Why is ${m.name}'s mentor profile not approved? They will see this.`);
      if (!reason || !reason.trim()) return;
    }
    setBusyId(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mentors/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setNotice(action === "APPROVE" ? `${m.name} is now listed.` : action === "REJECT" ? `${m.name} was not approved.` : action === "PAUSE" ? `${m.name} is hidden.` : `${m.name} is listed again.`);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Mentors</h1>
          <p className="text-xs text-slate-500 mt-0.5">Members who offer mentorship appear on /mentorship once approved here.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className={ghost} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${filter === f.value ? "bg-emerald-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {f.label}
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
        {!loading && mentors.length === 0 && (
          <div className="py-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No mentor profiles here.</p>
          </div>
        )}
        {mentors.map((m) => (
          <div key={m.id} className={`p-4 flex flex-col lg:flex-row gap-3 ${m.status === "PENDING" ? "bg-amber-50/40" : ""}`}>
            <div className="flex-1 min-w-0 space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE[m.status]}`}>{m.status}</span>
                <span className="text-[11px] text-slate-500">{m.domain} · applied {new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{m.name}{m.sscBatch ? <span className="font-normal text-slate-500"> · SSC {m.sscBatch}</span> : null}</p>
              <p className="text-slate-600">{m.designation}, {m.organization} · <span className="break-all">{m.email}</span></p>
              <details>
                <summary className="text-[11px] font-bold text-emerald-800 cursor-pointer">Bio &amp; topics</summary>
                <p className="text-slate-700 whitespace-pre-line mt-1">{m.bio}</p>
                <p className="text-slate-500 mt-1">Topics: {m.topicsOffered.join(", ")}</p>
              </details>
              <p className="text-[11px] text-slate-500">{m.menteesHelped} mentee{m.menteesHelped === 1 ? "" : "s"} helped{m.reviewedBy ? ` · reviewed by ${m.reviewedBy}` : ""}{m.rejectReason ? ` — ${m.rejectReason}` : ""}</p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 lg:w-36 shrink-0">
              {(m.status === "PENDING" || m.status === "REJECTED") && (
                <button type="button" disabled={busyId !== null} onClick={() => void act(m, "APPROVE")} className={primary}><CheckCircle2 className="w-4 h-4" /> Approve</button>
              )}
              {m.status !== "REJECTED" && (
                <button type="button" disabled={busyId !== null} onClick={() => void act(m, "REJECT")} className={`${ghost} text-rose-700 border-rose-200`}>Reject</button>
              )}
              {m.status === "APPROVED" && <button type="button" disabled={busyId !== null} onClick={() => void act(m, "PAUSE")} className={ghost}>Hide</button>}
              {m.status === "PAUSED" && <button type="button" disabled={busyId !== null} onClick={() => void act(m, "RESUME")} className={ghost}>List again</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
