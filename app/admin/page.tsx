"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  Layers,
  Heart,
  Calendar,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Copy,
  Check,
} from "lucide-react";
import type { VerificationRequestItem } from "@/lib/data";
import { decideVerification, fetchVerificationRequests } from "@/lib/admin-verifications";
import ProofOfStudy from "@/components/admin/ProofOfStudy";

interface AdminStats {
  totalRegistered: number;
  registeredThisWeek: number;
  verifiedAlumni: number;
  pendingReview: number;
  verificationRate: number;
  activeBatchesCount: number;
  batchRange: string;
  totalFunds: number;
  fundsFormatted: string;
  activeDrivesCount: number;
  reunionRsvpCount: number;
  reunionTitle: string;
}

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard.writeText(trx);
    setCopiedTrx(trx);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

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
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const showNotice = (text: string, isError = false) => {
    setActionNotice({ text, isError });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const decide = async (id: string, status: "VERIFIED" | "REJECTED") => {
    const target = requests.find((r) => r.id === id);
    setBusyId(id);
    try {
      const proof = await decideVerification(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, proof: proof ?? r.proof } : r)));
      // Also update dynamic counts optimistically
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pendingReview: Math.max(0, prev.pendingReview - 1),
              verifiedAlumni: status === "VERIFIED" ? prev.verifiedAlumni + 1 : prev.verifiedAlumni,
            }
          : null
      );
      showNotice(
        status === "VERIFIED"
          ? `Approved ${target?.fullName || "alumnus"}. Official verified badge granted.`
          : `Verification request for ${target?.fullName || "alumnus"} marked as rejected.`
      );
    } catch (err) {
      showNotice((err as Error).message, true);
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (id: string) => decide(id, "VERIFIED");
  const handleReject = (id: string) => decide(id, "REJECTED");

  const pendingCount = stats?.pendingReview ?? requests.filter((r) => r.status === "PENDING").length;
  const verifiedCount = stats?.verifiedAlumni ?? requests.filter((r) => r.status === "VERIFIED").length;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {actionNotice && (
        <div
          role={actionNotice.isError ? "alert" : "status"}
          className={`p-4 border rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs ${
            actionNotice.isError
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-emerald-50 border-emerald-300 text-emerald-900"
          }`}
        >
          {actionNotice.isError ? (
            <XCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          )}
          <span>{actionNotice.text}</span>
        </div>
      )}
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

        <div className="flex items-center gap-2">
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

      {/* KPI Stats Grid - 100% Dynamic from live database */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Total Registered</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.totalRegistered.toLocaleString() : "..."}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            +{stats ? stats.registeredThisWeek : 0} this week
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Verified Alumni</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{verifiedCount.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">
            {stats ? stats.verificationRate : 100}% verification rate
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
            {stats ? stats.activeBatchesCount : 0}
          </div>
          <span className="text-[10px] text-slate-400">
            {stats ? stats.batchRange : "All Batches"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Funds Raised</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.fundsFormatted : "৳0"}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {stats ? stats.activeDrivesCount : 1} active drives
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Reunion RSVPs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats ? stats.reunionRsvpCount.toLocaleString() : 0}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold truncate block" title={stats?.reunionTitle}>
            {stats ? stats.reunionTitle : "Grand Reunion"}
          </span>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Alumnus Name &amp; Contact</th>
                <th className="py-3 px-4">SSC Batch &amp; Roll</th>
                <th className="py-3 px-4">Profession &amp; City</th>
                <th className="py-3 px-4">Document Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading || loadError || requests.length === 0) && (
                <tr>
                  <td colSpan={6} className={`py-8 px-6 text-center ${loadError ? "text-rose-700" : "text-slate-400"}`}>
                    {loading ? "Loading verification requests…" : loadError ?? "No pending verification requests."}
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img src={r.avatarUrl || "/logo.png"} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{r.fullName}</div>
                        <div className="text-slate-500 text-[11px]">{r.email} • {r.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-800">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
                      Batch {r.sscBatch}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Roll: {r.rollNumber}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-medium text-slate-800">{r.profession}</div>
                    <div className="text-[11px] text-slate-400">{r.location}</div>
                  </td>
                  <td className="py-4 px-4 max-w-[16rem]">
                    {r.proof ? (
                      <ProofOfStudy proof={r.proof} />
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                        {r.documentType}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
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
                  <td className="py-4 px-6 text-right">
                    {r.status === "PENDING" && r.awaitingPayment ? (
                      <div className="flex flex-col items-end gap-1.5">
                        {(r.paymentMethod || r.transactionId) && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {r.paymentMethod && (
                              <span className="px-1.5 py-0.5 rounded font-black text-[10px] uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                {r.paymentMethod}
                              </span>
                            )}
                            {r.totalFee !== null && r.totalFee !== undefined && (
                              <span className="font-bold text-slate-800">৳{r.totalFee.toLocaleString("en-BD")}</span>
                            )}
                            {r.transactionId && (
                              <span className="flex items-center gap-1 font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 text-[10px]">
                                {r.transactionId}
                                <button
                                  type="button"
                                  onClick={() => handleCopyTrx(r.transactionId!)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy TrxID"
                                >
                                  {copiedTrx === r.transactionId ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={busyId !== null}
                            className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            title="Directly approve member and confirm Jubilee registration"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Approve &amp; Confirm</span>
                          </button>
                          <Link
                            href={r.membershipEventId ? `/admin/events/${r.membershipEventId}?tab=attendees` : `/admin/events`}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            title="Open Jubilee attendee list to review transaction"
                          >
                            <span>Jubilee List</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                          </Link>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-700">Awaiting Jubilee payment</span>
                      </div>
                    ) : r.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={busyId !== null}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={busyId !== null}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
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
