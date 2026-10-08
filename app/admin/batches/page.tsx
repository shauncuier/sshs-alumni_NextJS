"use client";

import React, { useEffect, useState } from "react";
import { Layers, Plus, Users, Calendar, Phone, Search, RefreshCw, AlertCircle, Award } from "lucide-react";
import Link from "next/link";

interface BatchItem {
  year: number;
  name: string;
  tagline: string;
  totalAlumni: number;
  classRepresentative?: string;
  representativePhone?: string;
  reunionDate?: string;
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/batches", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load batches report (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data.batches)) {
        setBatches(data.batches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batches report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.totalAlumni > 0).length;
  const totalAlumniAcrossBatches = batches.reduce((sum, b) => sum + (b.totalAlumni || 0), 0);

  const filteredBatches = batches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      String(b.year).includes(q) ||
      (b.classRepresentative && b.classRepresentative.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Batch Coordination Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real cohort member density, assign class representatives, and track reunions across batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBatches}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Batches"
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

      {/* Aggregate Report Cards - 100% Dynamic from Backend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700" /> Total Batches
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : totalBatches}
          </div>
          <span className="text-[10px] text-slate-400">1985 — {new Date().getFullYear()} cohorts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-600" /> Active Batches
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {loading ? "..." : activeBatches}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            With registered &amp; verified alumni
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" /> Total Enrolled Members
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : totalAlumniAcrossBatches.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Distributed across cohorts</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by batch year (e.g. 2008) or class representative..."
          className="w-full text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dynamic Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBatches.map((b) => (
          <div
            key={b.year}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {b.name}
              </span>
              <Link
                href={`/batches/${b.year}`}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                View Directory &rarr;
              </Link>
            </div>

            <h3 className="font-bold text-sm text-slate-900">{b.tagline}</h3>

            <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span>Total Alumni:</span>
                <span
                  className={`font-black ${
                    b.totalAlumni > 0 ? "text-emerald-700 font-bold" : "text-slate-400 font-normal"
                  }`}
                >
                  {b.totalAlumni} {b.totalAlumni === 1 ? "Member" : "Members"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Class Rep:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {b.classRepresentative || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rep Contact:</span>
                <span className="font-mono text-[11px] text-slate-700">
                  {b.representativePhone || "+880 1745-950025"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
