"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, Key, Plus, RefreshCw, AlertCircle, Search, Users } from "lucide-react";

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  batch: number | null;
  phone: string | null;
  createdAt: string;
}

interface AdminUserStats {
  totalUsers: number;
  superAdmins: number;
  admins: number;
  moderators: number;
  alumni: number;
  verifiedAlumni: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [stats, setStats] = useState<AdminUserStats>({
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    moderators: 0,
    alumni: 0,
    verifiedAlumni: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch users report (${res.status})`);
      }
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.users)) setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.batch && String(u.batch).includes(q))
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Administrator Roles &amp; Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor system access, executive authority, and operational privileges across accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic Role Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-600" /> Total Accounts
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : stats.totalUsers}
          </div>
          <span className="text-[10px] text-slate-400">All registered members</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Super Admins
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {loading ? "..." : stats.superAdmins}
          </div>
          <span className="text-[10px] text-amber-800 font-medium">Root authority</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-emerald-600" /> System Admins
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {loading ? "..." : stats.admins}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Console operators</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Moderators
          </span>
          <div className="text-2xl font-black text-blue-800 mt-1">
            {loading ? "..." : stats.moderators}
          </div>
          <span className="text-[10px] text-slate-400">Gate &amp; event stewards</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or batch..."
            className="w-full text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          {["ALL", "SUPER_ADMIN", "ADMIN", "MODERATOR", "ALUMNI"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                roleFilter === r
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r === "ALL" ? "All Roles" : r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b">
              <tr>
                <th className="py-3 px-6">Name &amp; Email</th>
                <th className="py-3 px-4">SSC Batch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Role Designation</th>
                <th className="py-3 px-6 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No users matching criteria.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-6">
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-slate-400 text-[11px] font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-800">
                    {u.batch ? `SSC '${String(u.batch).slice(-2)} (${u.batch})` : "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : u.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        u.role === "SUPER_ADMIN"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : u.role === "ADMIN"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : u.role === "MODERATOR"
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-400 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
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
