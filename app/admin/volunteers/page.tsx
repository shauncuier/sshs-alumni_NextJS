"use client";

import React, { useEffect, useState } from "react";
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  Utensils,
  HeartPulse,
  BookOpen,
  Music,
  GraduationCap,
  Users,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import type { VolunteerItem } from "@/lib/volunteers";
import { SUBCOMMITTEES, SUBCOMMITTEE_LABELS } from "@/lib/volunteers";

const ICONS_MAP: Record<string, React.ElementType> = {
  Sparkles,
  ShieldCheck,
  Utensils,
  HeartPulse,
  BookOpen,
  Music,
  GraduationCap,
  Users,
};

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [subcommitteeFilter, setSubcommitteeFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const reloadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/volunteers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load volunteers");
      setVolunteers(data.volunteers || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/volunteers")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.error) throw new Error(data.error);
        setVolunteers(data.volunteers || []);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUpdateStatus = async (
    id: string,
    status: "APPROVED" | "DECLINED" | "PENDING",
    subcommittee?: string
  ) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/volunteers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, subcommittee }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setVolunteers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status, ...(subcommittee ? { subcommittee, subcommitteeLabel: SUBCOMMITTEE_LABELS[subcommittee] || subcommittee } : {}) } : v))
      );
      showToast(`Volunteer status updated to ${status}.`);
    } catch (err) {
      showToast((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = volunteers.filter((v) => {
    if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
    if (subcommitteeFilter !== "ALL" && v.subcommittee !== subcommitteeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        v.fullName.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.toLowerCase().includes(q) ||
        String(v.sscBatch).includes(q) ||
        (v.skills && v.skills.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalCount = volunteers.length;
  const approvedCount = volunteers.filter((v) => v.status === "APPROVED").length;
  const pendingCount = volunteers.filter((v) => v.status === "PENDING").length;
  const medicalCount = volunteers.filter((v) => v.subcommittee === "MEDICAL_FIRSTAID").length;
  const gateCount = volunteers.filter((v) => v.subcommittee === "GATE_SECURITY").length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold border border-slate-700 animate-slideUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold mb-1">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
            Organizing Committee Service Wing
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Committee Volunteers &amp; Squad Roster
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, allocate subcommittees, and approve alumni volunteer applications for event logistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void reloadData()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <a
            href="/volunteer"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Public Volunteer Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Applicants</span>
          <strong className="text-2xl font-black text-slate-900 block my-1">{totalCount}</strong>
          <span className="text-[11px] text-slate-500">Across 8 wings</span>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Approved Squad</span>
          <strong className="text-2xl font-black text-emerald-900 block my-1">{approvedCount}</strong>
          <span className="text-[11px] text-emerald-700">Official Squad Pass issued</span>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Review</span>
          <strong className="text-2xl font-black text-amber-900 block my-1">{pendingCount}</strong>
          <span className="text-[11px] text-amber-700">Awaiting committee review</span>
        </div>

        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">Medical Wing</span>
          <strong className="text-2xl font-black text-rose-900 block my-1">{medicalCount}</strong>
          <span className="text-[11px] text-rose-700">Doctors &amp; First Aid</span>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">Gate &amp; Scanner</span>
          <strong className="text-2xl font-black text-blue-900 block my-1">{gateCount}</strong>
          <span className="text-[11px] text-blue-700">Security &amp; QR scanning</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by volunteer name, batch, phone, or skill..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "PENDING", "APPROVED", "DECLINED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Subcommittee Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Wing:</span>
          <button
            onClick={() => setSubcommitteeFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              subcommitteeFilter === "ALL"
                ? "bg-emerald-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Wings
          </button>
          {SUBCOMMITTEES.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSubcommitteeFilter(sub.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                subcommitteeFilter === sub.id
                  ? "bg-emerald-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading volunteers list...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-semibold">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No volunteers found matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">Volunteer Details</th>
                  <th className="p-3.5">Subcommittee Wing</th>
                  <th className="p-3.5">Skills &amp; Availability</th>
                  <th className="p-3.5">Source &amp; Applied</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const subDef = SUBCOMMITTEES.find((s) => s.id === item.subcommittee);
                  const Icon = subDef ? ICONS_MAP[subDef.icon] || Users : Users;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-slate-900 text-sm">{item.fullName}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          SSC {item.sscBatch} · {item.phone}
                        </div>
                        <div className="text-slate-500 text-[11px] font-mono">{item.email}</div>
                        {item.experience && (
                          <div className="text-[11px] text-slate-600 mt-1.5 italic bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                            &quot;{item.experience}&quot;
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 align-top">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold text-xs border border-emerald-200/80">
                          <Icon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{item.subcommitteeLabel}</span>
                        </div>
                        {subDef?.bengaliName && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            {subDef.bengaliName}
                          </div>
                        )}
                        {/* Option to reassign wing */}
                        <div className="mt-2">
                          <select
                            value={item.subcommittee}
                            onChange={(e) =>
                              handleUpdateStatus(item.id, item.status, e.target.value)
                            }
                            className="text-[11px] px-2 py-1 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 font-medium"
                          >
                            {SUBCOMMITTEES.map((s) => (
                              <option key={s.id} value={s.id}>
                                Reassign: {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="p-3.5 align-top space-y-1">
                        {item.skills && (
                          <div>
                            <span className="font-semibold text-slate-700">Skills: </span>
                            <span className="text-slate-600">{item.skills}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-700">Availability: </span>
                          <span className="text-emerald-800 font-medium">{item.availability || "Anytime"}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 mt-1">
                            <strong>Note:</strong> {item.notes}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 align-top text-[11px] text-slate-500 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.source === "EVENT_REGISTRATION"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.source === "EVENT_REGISTRATION" ? "Event RSVP Opt-In" : "Public Form"}
                        </span>
                        <div className="mt-1">
                          {new Date(item.appliedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="p-3.5 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "DECLINED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {item.status === "DECLINED" && <XCircle className="w-3.5 h-3.5" />}
                          {item.status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      <td className="p-3.5 align-top text-right whitespace-nowrap space-x-1.5">
                        {item.status !== "APPROVED" && (
                          <button
                            disabled={busyId === item.id}
                            onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                            className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {item.status !== "DECLINED" && (
                          <button
                            disabled={busyId === item.id}
                            onClick={() => handleUpdateStatus(item.id, "DECLINED")}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs disabled:opacity-50 transition-colors"
                          >
                            Decline
                          </button>
                        )}
                        {item.status !== "PENDING" && (
                          <button
                            disabled={busyId === item.id}
                            onClick={() => handleUpdateStatus(item.id, "PENDING")}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs disabled:opacity-50 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
