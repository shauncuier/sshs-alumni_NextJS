"use client";

import React, { useState } from "react";
import { ShieldCheck, UserCheck, Key, Plus } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([
    { id: 1, name: "Dr. Kazi Minhazur Rahman", email: "president@sabujsghs.edu.bd", role: "SUPER_ADMIN", batch: 2005 },
    { id: 2, name: "Md. Jashedul Islam", email: "jashedul@example.com", role: "ADMIN", batch: 2008 },
    { id: 3, name: "Dr. Nusrat Jahan", email: "dr.nusrat@example.com", role: "MODERATOR", batch: 2006 },
    { id: 4, name: "Farhana Rahman", email: "farhana@greenharvest.io", role: "ADMIN", batch: 2011 },
  ]);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Administrator Roles &amp; Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system access for Executive Board officers, batch moderators, and content editors.
          </p>
        </div>

        <button className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Grant Role
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b">
            <tr>
              <th className="py-3 px-6">Name &amp; Email</th>
              <th className="py-3 px-4">SSC Batch</th>
              <th className="py-3 px-4">Role Designation</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-900">{u.name}</div>
                  <div className="text-slate-400 text-[11px]">{u.email}</div>
                </td>
                <td className="py-4 px-4 font-semibold text-emerald-800">
                  SSC {u.batch}
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      u.role === "SUPER_ADMIN"
                        ? "bg-amber-100 text-amber-900"
                        : u.role === "ADMIN"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button className="text-emerald-700 hover:underline font-semibold">
                    Change Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
