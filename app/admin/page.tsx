"use client";

import React, { useState } from "react";
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
  Plus
} from "lucide-react";
import { sampleVerificationRequests } from "@/lib/data";

export default function AdminDashboardPage() {
  const [requests, setRequests] = useState(sampleVerificationRequests);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    const target = requests.find((r) => r.id === id);
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: "VERIFIED" as const } : r))
    );
    setActionNotice(`Approved ${target?.fullName || "alumnus"}. Official verified badge granted.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleReject = (id: string) => {
    const target = requests.find((r) => r.id === id);
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: "REJECTED" as const } : r))
    );
    setActionNotice(`Verification request for ${target?.fullName || "alumnus"} marked as rejected.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const verifiedCount = 4890 + requests.filter((r) => r.status === "VERIFIED").length;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Total Registered</div>
          <div className="text-2xl font-black text-slate-900 mt-1">5,200</div>
          <span className="text-[10px] text-emerald-600 font-semibold">+24 this week</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Verified Alumni</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{verifiedCount.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">94% verification rate</span>
        </div>

        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="text-amber-700 text-xs font-bold">Pending Review</div>
          <div className="text-2xl font-black text-amber-800 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-900 font-medium">Action required</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Active Batches</div>
          <div className="text-2xl font-black text-slate-900 mt-1">41</div>
          <span className="text-[10px] text-slate-400">1985 — 2025</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Funds Raised</div>
          <div className="text-2xl font-black text-slate-900 mt-1">৳18.5L</div>
          <span className="text-[10px] text-emerald-600 font-semibold">4 active drives</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium">Reunion RSVPs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">840</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Nov 20 Reunion</span>
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
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900 text-sm">{r.fullName}</div>
                    <div className="text-slate-500 text-[11px]">{r.email} • {r.phone}</div>
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
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                      {r.documentType}
                    </span>
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
                    {r.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-semibold transition-colors"
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
