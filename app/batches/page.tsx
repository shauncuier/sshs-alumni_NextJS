"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BatchCard from "@/components/batches/BatchCard";
import type { BatchInfo } from "@/lib/data";
import { sampleBatches } from "@/lib/data";
import { Layers, Loader2 } from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchInfo[]>(sampleBatches);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.batches && Array.isArray(data.batches) && data.batches.length > 0) {
          setBatches(data.batches);
        }
      })
      .catch((err) => {
        console.error("Failed to load batches:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header Banner */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Layers className="w-3.5 h-3.5" />
                <span>Classroom Chronicles</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Explore Batches (1985 — {new Date().getFullYear()})
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Every batch has shaped the legacy of Sabuj Shikshayatan Government High School. Browse your batch year to find classmates, connect with class representatives, view reunion schedules, and contribute to batch funds.
              </p>
            </div>
          </div>
        </section>

        {/* Batches Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
              <p className="text-xs font-semibold">Loading batch directory…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {batches.map((batch) => (
                <BatchCard key={batch.year} batch={batch} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
