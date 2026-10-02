"use client";

import React, { useEffect, useState } from "react";
import type { VerificationRequestItem } from "@/lib/data";
import { decideVerification, fetchVerificationRequests } from "@/lib/admin-verifications";
import Link from "next/link";
import ProofOfStudy from "@/components/admin/ProofOfStudy";
import {
  Search,
  Check,
  Download,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function AdminAlumniPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PAYMENT_PENDING" | "PENDING" | "VERIFIED" | "REJECTED">("all");
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationRequests("all")
      .then(setRequests)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard.writeText(trx);
    setCopiedTrx(trx);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  const pendingPaymentCount = requests.filter((r) => r.awaitingPayment).length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const verifiedCount = requests.filter((r) => r.status === "VERIFIED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "PAYMENT_PENDING") {
      if (!r.awaitingPayment) return false;
    } else if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.sscBatch.toString().includes(q) ||
        (r.transactionId && r.transactionId.toLowerCase().includes(q)) ||
        (r.paymentMethod && r.paymentMethod.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const decide = async (id: string, status: "VERIFIED" | "REJECTED") => {
    setBusyId(id);
    setError(null);
    try {
      const proof = await decideVerification(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, proof: proof ?? r.proof } : r)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = (id: string) => decide(id, "VERIFIED");
  const handleReject = (id: string) => decide(id, "REJECTED");

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Alumni Verification Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validate incoming registrations against the school register and verify attendee payments to award Verified Alumni status.
          </p>
        </div>

        <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, batch, email, or TrxID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">({requests.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter("PAYMENT_PENDING")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === "PAYMENT_PENDING"
                ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
                : "bg-amber-50 text-amber-900 border border-amber-300/80 hover:bg-amber-100"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Verification</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusFilter === "PAYMENT_PENDING" ? "bg-white text-amber-700" : "bg-amber-600 text-white"
            }`}>
              {pendingPaymentCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              statusFilter === "PENDING"
                ? "bg-emerald-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Pending</span>
            <span className="text-[10px] opacity-75">({pendingCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("VERIFIED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              statusFilter === "VERIFIED"
                ? "bg-emerald-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Verified</span>
            <span className="text-[10px] opacity-75">({verifiedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              statusFilter === "REJECTED"
                ? "bg-rose-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Rejected</span>
            <span className="text-[10px] opacity-75">({rejectedCount})</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Roll</th>
                <th className="py-3 px-4">Profession</th>
                <th className="py-3 px-4">Proof of study</th>
                <th className="py-3 px-4">Payment Verification</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading || filteredRequests.length === 0) && (
                <tr>
                  <td colSpan={9} className="py-8 px-6 text-center text-slate-400">
                    {loading ? "Loading verification requests…" : "No verification requests match."}
                  </td>
                </tr>
              )}
              {filteredRequests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img src={r.avatarUrl || "/logo.png"} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">{r.fullName}</div>
                        <div className="text-slate-400 text-[11px]">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-emerald-800">SSC {r.sscBatch}</td>
                  <td className="py-4 px-4 font-medium text-slate-600">{r.rollNumber}</td>
                  <td className="py-4 px-4 text-slate-700">{r.profession}</td>
                  <td className="py-4 px-4 max-w-[16rem]">
                    <ProofOfStudy proof={r.proof} emptyText="No proof uploaded" />
                  </td>
                  <td className="py-4 px-4 min-w-[14rem]">
                    {r.transactionId || r.paymentMethod || r.totalFee ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wide ${
                              r.paymentMethod?.toLowerCase().includes("bkash")
                                ? "bg-pink-100 text-pink-700 border border-pink-200"
                                : r.paymentMethod?.toLowerCase().includes("nagad")
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : r.paymentMethod?.toLowerCase().includes("rocket")
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {r.paymentMethod || "Payment"}
                          </span>
                          {r.totalFee !== null && r.totalFee !== undefined && (
                            <span className="font-bold text-slate-900 text-xs">
                              ৳{r.totalFee.toLocaleString("en-BD")}
                            </span>
                          )}
                        </div>

                        {r.transactionId && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 w-fit">
                            <span className="text-slate-400 select-none text-[10px]">TrxID:</span>
                            <span className="font-bold select-all">{r.transactionId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyTrx(r.transactionId!)}
                              className="text-slate-400 hover:text-slate-800 ml-1 p-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Copy Transaction ID to clipboard"
                            >
                              {copiedTrx === r.transactionId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {r.awaitingPayment ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting verification
                          </div>
                        ) : r.paymentStatus === "CONFIRMED" || r.status === "VERIFIED" ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Payment confirmed
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No fee required</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-400">{r.submittedAt}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        r.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {r.status === "PENDING" && r.awaitingPayment ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5 justify-end">
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
                          className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={busyId !== null}
                          className="px-3 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Reviewed</span>
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
