"use client";

import React, { useEffect, useState } from "react";
import { Layers, Users, Search, RefreshCw, AlertCircle, Award, Pencil, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface BatchItem {
  year: number;
  name: string;
  tagline: string;
  totalAlumni: number;
  classRepresentative?: string;
  representativePhone?: string;
  reunionDate?: string;
  reunionDateIso?: string;
  description?: string;
}

const field = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";

function EditBatch({ batch, onClose, onSaved }: { batch: BatchItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    classRepresentative: batch.classRepresentative ?? "",
    representativePhone: batch.representativePhone ?? "",
    tagline: batch.tagline ?? "",
    description: batch.description ?? "",
    reunionDate: batch.reunionDateIso ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/batches/${batch.year}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label={`Edit SSC Batch ${batch.year}`} onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">SSC Batch {batch.year}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="b-rep" className="block text-xs font-semibold text-slate-700 mb-1.5">Batch representative</label>
            <input id="b-rep" maxLength={120} className={field} value={form.classRepresentative} onChange={(e) => setForm({ ...form, classRepresentative: e.target.value })} />
          </div>
          <div>
            <label htmlFor="b-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">Representative phone</label>
            <input id="b-phone" type="tel" maxLength={30} className={field} value={form.representativePhone} onChange={(e) => setForm({ ...form, representativePhone: e.target.value })} placeholder="Shown publicly" />
          </div>
        </div>
        <div>
          <label htmlFor="b-tag" className="block text-xs font-semibold text-slate-700 mb-1.5">Tagline</label>
          <input id="b-tag" maxLength={200} className={field} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
        </div>
        <div>
          <label htmlFor="b-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
          <textarea id="b-desc" rows={3} maxLength={2000} className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label htmlFor="b-date" className="block text-xs font-semibold text-slate-700 mb-1.5">Next batch reunion</label>
          <input id="b-date" type="date" className={field} value={form.reunionDate} onChange={(e) => setForm({ ...form, reunionDate: e.target.value })} />
        </div>
        <p className="text-[11px] text-slate-500">The representative and phone are shown on the public batch page; leave empty if the batch has none yet.</p>
        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={saving} className="w-full px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </form>
    </div>
  );
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<BatchItem | null>(null);

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
    loadBatches(); // eslint-disable-line react-hooks/set-state-in-effect
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
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setEditing(b)} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <Link href={`/batches/${b.year}`} className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline">
                  View &rarr;
                </Link>
              </div>
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
                  {b.representativePhone || "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditBatch
          batch={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void loadBatches();
          }}
        />
      )}
    </div>
  );
}
