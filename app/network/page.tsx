"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { sampleAlumni, AlumniMember } from "@/lib/data";
import {
  Users,
  UserCheck,
  UserPlus,
  Check,
  X,
  Search,
  BadgeCheck,
  MapPin,
  Briefcase
} from "lucide-react";

export default function NetworkPage() {
  const [activeTab, setActiveTab] = useState<"connections" | "requests" | "suggestions">("suggestions");
  const [connections, setConnections] = useState<string[]>(["alm-2", "alm-3"]);
  const [pendingRequests, setPendingRequests] = useState<AlumniMember[]>([sampleAlumni[4]]);

  const handleConnect = (id: string) => {
    setConnections([...connections, id]);
  };

  const handleAccept = (id: string) => {
    setConnections([...connections, id]);
    setPendingRequests(pendingRequests.filter((r) => r.id !== id));
  };

  const handleReject = (id: string) => {
    setPendingRequests(pendingRequests.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="My Network & Connections" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("suggestions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "suggestions"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Discover Alumni ({sampleAlumni.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors relative ${
                  activeTab === "requests"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>Requests</span>
                {pendingRequests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("connections")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "connections"
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                Connected ({connections.length})
              </button>
            </div>
          </div>

          {/* Pending Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900">
                Incoming Connection Requests ({pendingRequests.length})
              </h3>
              {pendingRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border text-center text-xs text-slate-500">
                  No pending connection requests.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingRequests.map((alumnus) => (
                    <div
                      key={alumnus.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={alumnus.avatarUrl}
                          alt={alumnus.fullName}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-900">{alumnus.fullName}</div>
                          <div className="text-xs text-slate-500">SSC &apos;{alumnus.sscBatch} • {alumnus.profession}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAccept(alumnus.id)}
                          className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(alumnus.id)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs"
                          title="Ignore"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggestions Tab */}
          {activeTab === "suggestions" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleAlumni.map((alumnus) => {
                const isConn = connections.includes(alumnus.id);
                return (
                  <div
                    key={alumnus.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={alumnus.avatarUrl}
                        alt={alumnus.fullName}
                        className="w-14 h-14 rounded-2xl object-cover border border-emerald-100 shrink-0"
                      />
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/profile?id=${alumnus.id}`} className="font-bold text-sm text-slate-900 hover:underline truncate">
                            {alumnus.fullName}
                          </Link>
                          {alumnus.isVerified && (
                            <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white shrink-0" />
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md inline-block">
                          SSC Batch {alumnus.sscBatch}
                        </span>
                        <div className="text-xs text-slate-600 truncate">{alumnus.profession}</div>
                        <div className="text-[11px] text-slate-400">{alumnus.locationCity}, {alumnus.locationCountry}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {alumnus.connectionCount} connections
                      </span>
                      <button
                        onClick={() => handleConnect(alumnus.id)}
                        disabled={isConn}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isConn
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-emerald-800 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isConn ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Connected
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Connect
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connected Tab */}
          {activeTab === "connections" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleAlumni
                .filter((a) => connections.includes(a.id))
                .map((alumnus) => (
                  <div
                    key={alumnus.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={alumnus.avatarUrl}
                        alt={alumnus.fullName}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900">{alumnus.fullName}</div>
                        <div className="text-xs text-slate-500">{alumnus.profession}</div>
                      </div>
                    </div>
                    <Link
                      href="/messages"
                      className="block text-center w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-colors"
                    >
                      Send Message
                    </Link>
                  </div>
                ))}
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
