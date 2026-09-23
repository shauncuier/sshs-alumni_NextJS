"use client";

import React, { useState, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AlumniCard from "@/components/alumni/AlumniCard";
import { sampleAlumni, sampleBatches } from "@/lib/data";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  BadgeCheck,
  UserCheck,
  GraduationCap
} from "lucide-react";

export default function AlumniDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedProfession, setSelectedProfession] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Extract unique professions & cities
  const uniqueProfessions = useMemo(() => {
    const set = new Set(sampleAlumni.map((a) => a.profession.split(" ")[0]));
    return Array.from(set);
  }, []);

  const uniqueCities = useMemo(() => {
    const set = new Set(sampleAlumni.map((a) => a.locationCity));
    return Array.from(set);
  }, []);

  // Filter logic
  const filteredAlumni = useMemo(() => {
    return sampleAlumni.filter((alumnus) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          alumnus.fullName.toLowerCase().includes(q) ||
          alumnus.profession.toLowerCase().includes(q) ||
          alumnus.company.toLowerCase().includes(q) ||
          alumnus.locationCity.toLowerCase().includes(q) ||
          alumnus.sscBatch.toString().includes(q);
        if (!matches) return false;
      }

      // Batch
      if (selectedBatch !== "all" && alumnus.sscBatch.toString() !== selectedBatch) {
        return false;
      }

      // Profession
      if (
        selectedProfession !== "all" &&
        !alumnus.profession.toLowerCase().includes(selectedProfession.toLowerCase())
      ) {
        return false;
      }

      // Location
      if (selectedLocation !== "all" && alumnus.locationCity !== selectedLocation) {
        return false;
      }

      // Verified only
      if (verifiedOnly && !alumnus.isVerified) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedBatch, selectedProfession, selectedLocation, verifiedOnly]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBatch("all");
    setSelectedProfession("all");
    setSelectedLocation("all");
    setVerifiedOnly(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Directory Header Banner */}
        <section className="bg-[#06281e] text-white py-14 sm:py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Sabuj Shikshayatan Official Directory</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Alumni Directory &amp; Classmate Finder
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Search over 5,000 former students across 40 batches. Connect with classmates, browse career trajectories, and discover alumni in your city or industry.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Controls Bar */}
        <section className="sticky top-20 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alumni by name, profession, batch, or company..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    viewMode === "grid"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    viewMode === "list"
                      ? "bg-emerald-800 text-white border-emerald-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
              </span>

              {/* Batch Filter */}
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">All Batches (1985-2025)</option>
                {sampleBatches.map((b) => (
                  <option key={b.year} value={b.year.toString()}>
                    SSC Batch {b.year}
                  </option>
                ))}
              </select>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">All Locations</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              {/* Verified Switch */}
              <button
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors ${
                  verifiedOnly
                    ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Alumni Only</span>
              </button>

              {(searchQuery || selectedBatch !== "all" || selectedLocation !== "all" || verifiedOnly) && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold ml-auto flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Directory Results */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex items-center justify-between mb-6 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredAlumni.length}</strong> alumni profiles
            </span>
            <span>Sorted by Recent Activity &amp; Batch</span>
          </div>

          {filteredAlumni.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Alumni Found</h3>
              <p className="text-xs text-slate-500">
                No alumni match your current search and filter combination. Try clearing your filters or searching with a different term.
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredAlumni.map((alumnus) => (
                <AlumniCard key={alumnus.id} alumni={alumnus} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlumni.map((alumnus) => (
                <AlumniCard key={alumnus.id} alumni={alumnus} viewMode="list" />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
