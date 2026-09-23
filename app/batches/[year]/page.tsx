"use client";

import React, { use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AlumniCard from "@/components/alumni/AlumniCard";
import { sampleBatches, sampleAlumni } from "@/lib/data";
import {
  Users,
  Calendar,
  Phone,
  ArrowLeft,
  ShieldCheck,
  MessageSquare,
  Image,
  Award
} from "lucide-react";

interface BatchPageProps {
  params: Promise<{ year: string }>;
}

export default function BatchDetailPage({ params }: BatchPageProps) {
  const resolvedParams = use(params);
  const yearNum = parseInt(resolvedParams.year, 10);

  const batch =
    sampleBatches.find((b) => b.year === yearNum) || {
      year: yearNum,
      name: `SSC Batch ${yearNum}`,
      tagline: `Pride of Class of ${yearNum}`,
      totalAlumni: 120,
      classRepresentative: "Class Committee",
      representativePhone: "+880 1700-000000",
      coverImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
      description: `The proud alumni of SSC Batch ${yearNum} from Sabuj Shikshayatan Government High School.`,
    };

  // Find alumni from this batch
  const batchAlumni = sampleAlumni.filter((a) => a.sscBatch === yearNum);
  const displayAlumni = batchAlumni.length > 0 ? batchAlumni : sampleAlumni.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Hero Cover */}
        <div className="relative h-64 sm:h-80 bg-slate-900 overflow-hidden">
          <img
            src={batch.coverImage}
            alt={batch.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06281e] via-[#06281e]/50 to-transparent" />

          <div className="absolute top-6 left-4 sm:left-8">
            <Link
              href="/batches"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> All Batches
            </Link>
          </div>

          <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 text-white max-w-4xl">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-2">
              SSC Batch {batch.year}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {batch.name} — {batch.tagline}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl">
              {batch.description}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{batch.totalAlumni}</div>
                <div className="text-xs text-slate-500 font-semibold">Registered Batchmates</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900 line-clamp-1">{batch.classRepresentative}</div>
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {batch.representativePhone}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">
                  {batch.reunionDate || "TBA"}
                </div>
                <div className="text-xs text-slate-500 font-semibold">Next Scheduled Gathering</div>
              </div>
            </div>
          </div>
        </div>

        {/* Batchmates Roster */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Batch Members</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Class of {batch.year} alumni currently connected on the official portal.
              </p>
            </div>
            <Link
              href="/register"
              className="text-xs font-bold px-4 py-2 bg-emerald-800 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              I am from Batch &apos;{batch.year}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayAlumni.map((alumnus) => (
              <AlumniCard key={alumnus.id} alumni={alumnus} viewMode="grid" />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
