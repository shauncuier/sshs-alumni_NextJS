"use client";

import React, { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AlumniCard from "@/components/alumni/AlumniCard";
import type { AlumniMember } from "@/lib/data";
import {
  Users,
  Calendar,
  Phone,
  ArrowLeft,
  ShieldCheck,
  UserPlus,
  Loader2,
} from "lucide-react";

interface BatchPageProps {
  params: Promise<{ year: string }>;
}

interface DirectoryRow {
  id: string;
  fullName: string;
  sscBatch: number;
  graduationYear: number;
  section: string | null;
  profession: string;
  company: string | null;
  industry: string | null;
  locationCity: string;
  locationCountry: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  skills: unknown;
  verificationStatus: string;
  user: { email: string | null };
}

function toMember(row: DirectoryRow): AlumniMember {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.user?.email ?? "",
    sscBatch: row.sscBatch,
    graduationYear: row.graduationYear,
    profession: row.profession,
    company: row.company ?? "",
    industry: row.industry ?? "",
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    bio: row.bio ?? "",
    avatarUrl: row.avatarUrl ?? "",
    coverUrl: row.coverUrl ?? "",
    phone: row.phone ?? "",
    skills: Array.isArray(row.skills)
      ? row.skills.filter((s): s is string => typeof s === "string")
      : [],
    isVerified: row.verificationStatus === "VERIFIED",
    connectionCount: 0,
  };
}

export default function BatchDetailPage({ params }: BatchPageProps) {
  const resolvedParams = use(params);
  const yearNum = Number(resolvedParams.year);

  // Only real SSC batches (1985 to this year) have a page; anything else is a 404.
  if (!Number.isInteger(yearNum) || yearNum < 1985 || yearNum > new Date().getFullYear()) {
    notFound();
  }

  const [alumni, setAlumni] = useState<AlumniMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<{ title: string; date: string } | null>(null);

  useEffect(() => {
    // Fetch alumni for this specific batch
    fetch(`/api/alumni?batch=${yearNum}`)
      .then((res) => (res.ok ? res.json() : { alumni: [] }))
      .then((data: { alumni?: DirectoryRow[] }) => {
        const rows = data.alumni || [];
        setAlumni(rows.map(toMember));
      })
      .catch((err) => {
        console.error("Failed to load batch alumni:", err);
        setAlumni([]);
      })
      .finally(() => setLoading(false));

    // Fetch upcoming events to display real next gathering
    fetch("/api/events")
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((data: { events?: Array<{ title: string; date: string }> }) => {
        const upcoming = (data.events || []).find(
          (e) => new Date(e.date).getTime() >= Date.now() - 86400000
        );
        if (upcoming) {
          setNextEvent(upcoming);
        }
      })
      .catch(() => {});
  }, [yearNum]);

  // Determine coordinator from registered batch members or committee
  const coordinator = alumni.find((a) => a.isVerified) || alumni[0];
  const representativeName = coordinator
    ? `${coordinator.fullName} (Batch Coordinator)`
    : "Central Executive Committee";
  const representativePhone = coordinator?.phone || "+880 1745-950025";

  const nextGatheringTitle = nextEvent ? nextEvent.title : "Golden Jubilee Grand Celebration (2026)";
  const nextGatheringDate = nextEvent
    ? new Date(nextEvent.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Dec 30, 2026";

  const batch = {
    year: yearNum,
    name: `SSC Batch ${yearNum}`,
    tagline: `Pride of Class of ${yearNum}`,
    totalAlumni: alumni.length,
    classRepresentative: representativeName,
    representativePhone: representativePhone,
    coverImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
    description: `The proud alumni of SSC Batch ${yearNum} from Sabuj Shikshayatan Government High School.`,
  };

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

        {/* Info Grid - 100% Dynamic */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">
                  {loading ? "…" : alumni.length}
                </div>
                <div className="text-xs text-slate-500 font-semibold">Registered Batchmates</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">
                  {batch.classRepresentative}
                </div>
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{batch.representativePhone}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate" title={nextGatheringTitle}>
                  {nextGatheringTitle}
                </div>
                <div className="text-xs text-slate-500 font-semibold">{nextGatheringDate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Batchmates Roster */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Batch Members</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Class of {batch.year} alumni currently connected on the official portal.
              </p>
            </div>
            <Link
              href="/register"
              className="text-xs font-bold px-4 py-2.5 bg-emerald-800 text-white rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>I am from Batch &apos;{batch.year}</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
              <p className="text-xs font-semibold">Loading batch members…</p>
            </div>
          ) : alumni.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumni.map((alumnus) => (
                <AlumniCard key={alumnus.id} alumni={alumnus} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  No registered alumni yet for SSC Batch {batch.year}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Be the first graduate from the Class of {batch.year} to create a profile and claim the batch representative badge.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as Batch &apos;{batch.year} Alumnus</span>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
