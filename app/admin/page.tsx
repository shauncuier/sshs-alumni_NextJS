"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserCheck, ArrowRight, Plus, MessageSquare } from "lucide-react";
import type { VerificationRequestItem } from "@/lib/data";
import { fetchVerificationRequests } from "@/lib/admin-verifications";
import ProofOfStudy from "@/components/admin/ProofOfStudy";

interface AdminStats {
  totalRegistered: number;
  registeredThisWeek: number;
  verifiedAlumni: number;
  pendingReview: number;
  verificationRate: number | null;
  activeBatchesCount: number;
  batchRange: string;
  totalFunds: number;
  fundsFormatted: string;
  activeDrivesCount: number;
  reunionRsvpCount: number;
  reunionTitle: string;
  paperFormCount: number;
  paperFormFees: number;
  membershipEventId: string | null;
}

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The figures failed to load: show "—", never made-up numbers.
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchVerificationRequests("PENDING"),
      fetch("/api/admin/stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data?.stats ?? null)
        .catch(() => null),
    ])
      .then(([reqs, dynamicStats]) => {
        setRequests(reqs);
        if (dynamicStats) setStats(dynamicStats);
        else setStatsError(true);
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);


  const pendingCount = stats?.pendingReview ?? requests.filter((r) => r.status === "PENDING").length;
  const verifiedCount = stats?.verifiedAlumni ?? requests.filter((r) => r.status === "VERIFIED").length;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Alumni Administration &amp; Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official executive management portal for Sabuj Shikshayatan Government High School.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/sms"
            className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs border border-emerald-800"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" /> Bulk SMS Broadcast
          </Link>
          <Link
            href="/admin/events"
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Event
          </Link>
          <Link
            href="/admin/alumni"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" /> Full Verification Queue
          </Link>
        </div>
      </div>

      {statsError && (
        <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          The figures could not be loaded. Refresh the page to try again.
        </p>
      )}
      {/* Figures from the database (see /api/admin/stats) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Total Registered</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.totalRegistered.toLocaleString() : loading ? "…" : "—"}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            +{stats ? stats.registeredThisWeek : 0} this week
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Verified Alumni</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{verifiedCount.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">
            {stats?.verificationRate != null ? `${stats.verificationRate}% verified` : "—"}
          </span>
        </div>

        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-amber-700 text-xs font-bold">Pending Review</div>
          <div className="text-2xl font-black text-amber-800 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-900 font-medium">Action required</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Active Batches</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.activeBatchesCount : "—"}
          </div>
          <span className="text-[10px] text-slate-400">
            {stats ? stats.batchRange : "—"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Funds Raised</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.fundsFormatted : "—"}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {stats ? `${stats.activeDrivesCount} active ${stats.activeDrivesCount === 1 ? "campaign" : "campaigns"}` : "—"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Reunion RSVPs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.reunionRsvpCount.toLocaleString() : "—"}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold truncate block" title={stats?.reunionTitle}>
            {stats ? stats.reunionTitle : "—"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <a href={stats?.membershipEventId ? `/admin/events/${stats.membershipEventId}?tab=attendees` : "/admin/events"} className="block text-slate-400 text-xs font-medium hover:underline">
            Paper Forms
          </a>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.paperFormCount.toLocaleString() : "—"}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold">
            {stats ? `৳${stats.paperFormFees.toLocaleString("en-IN")} collected` : "—"}
          </span>
          <Link href="/admin/events/offline" className="mt-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold hover:bg-amber-200">
            + Add offline form
          </Link>
        </div>
      </div>

      {/* Verification Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Pending Alumni Verification Requests
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review SSC graduation certificates and testimonials against school registers.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full">
            {pendingCount} Pending
          </span>
        </div>

        <div className="md:overflow-x-auto">
          <table className="w-full text-left text-xs block md:table">
            <thead className="hidden md:table-header-group bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Alumnus Name &amp; Contact</th>
                <th className="py-3 px-4">SSC Batch &amp; Roll</th>
                <th className="py-3 px-4">Profession &amp; City</th>
                <th className="py-3 px-4">Document Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group space-y-2 md:space-y-0 md:divide-y md:divide-slate-100">
              {(loading || loadError || requests.length === 0) && (
                <tr className="block md:table-row">
                  <td colSpan={6} className={`py-8 px-6 text-center ${loadError ? "text-rose-700" : "text-slate-400"}`}>
                    {loading ? "Loading verification requests…" : loadError ?? "No pending verification requests."}
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="block md:table-row border border-slate-200 rounded-xl p-3 md:p-0 md:border-0 md:rounded-none hover:bg-slate-50/80 transition-colors">
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <img loading="lazy" decoding="async" src={r.avatarUrl || "/logo.png"} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{r.fullName}</div>
                        <div className="text-slate-500 text-[11px]">{r.email} • {r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-4 font-semibold text-slate-800">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
                      Batch {r.sscBatch}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Roll: {r.rollNumber}</div>
                  </td>
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-4">
                    <div className="font-medium text-slate-800">{r.profession}</div>
                    <div className="text-[11px] text-slate-400">{r.location}</div>
                  </td>
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-4 md:max-w-[16rem]">
                    {r.proof ? (
                      <ProofOfStudy proof={r.proof} />
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                        {r.documentType}
                      </span>
                    )}
                  </td>
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-4">
                    {r.status === "VERIFIED" ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        VERIFIED
                      </span>
                    ) : r.status === "REJECTED" ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                        REJECTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="block md:table-cell py-0.5 md:py-4 md:px-6 md:text-right">
                    {r.status === "PENDING" ? (
                      <Link
                        href={`/admin/verifications?id=${r.id}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        Review <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
