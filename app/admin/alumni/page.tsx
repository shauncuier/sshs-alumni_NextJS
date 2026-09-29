"use client";

import React, { useEffect, useState } from "react";
import type { VerificationRequestItem } from "@/lib/data";
import { decideVerification, fetchVerificationRequests } from "@/lib/admin-verifications";
import { Search, Filter, Check, X, ShieldCheck, Download } from "lucide-react";

export default function AdminAlumniPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchVerificationRequests("all")
      .then(setRequests)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.sscBatch.toString().includes(q)
      );
    }
    return true;
  });

  const decide = async (id: string, status: "VERIFIED" | "REJECTED") => {
    setBusyId(id);
    setError(null);
    try {
      await decideVerification(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
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
            Validate incoming registrations against the school register to award Verified Alumni status.
          </p>
        </div>

        <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, batch, or email..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {["all", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === s
                  ? "bg-emerald-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
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
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading || filteredRequests.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-slate-400">
                    {loading ? "Loading verification requests…" : "No verification requests match."}
                  </td>
                </tr>
              )}
              {filteredRequests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900">{r.fullName}</div>
                    <div className="text-slate-400 text-[11px]">{r.email}</div>
                  </td>
                  <td className="py-4 px-4 font-bold text-emerald-800">SSC {r.sscBatch}</td>
                  <td className="py-4 px-4 font-medium text-slate-600">{r.rollNumber}</td>
                  <td className="py-4 px-4 text-slate-700">{r.profession}</td>
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
                      <span className="text-[11px] font-semibold text-amber-700">Awaiting payment confirmation — approve from the Jubilee attendee list</span>
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
