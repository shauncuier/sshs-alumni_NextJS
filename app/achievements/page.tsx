"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleAchievements } from "@/lib/data";
import { Award, Medal, Sparkles, Filter } from "lucide-react";

export default function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    "all",
    "Doctors",
    "Engineers",
    "Entrepreneurs",
    "Researchers",
    "Government Officers",
  ];

  const filteredAchievements = sampleAchievements.filter((ach) => {
    if (selectedCategory !== "all" && ach.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Award className="w-3.5 h-3.5 fill-amber-300" />
                <span>Hall of Distinction</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Alumni Achievements &amp; Laurels
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Celebrating Sabuj Shikshayatan graduates whose exceptional professional, scholarly, and humanitarian contributions reflect glory upon their alma mater and country.
              </p>
            </div>
          </div>
        </section>

        {/* Category Pills */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All Laureates" : cat}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredAchievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-300">
                      {ach.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Awarded {ach.yearAwarded}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 pt-1">
                    <img
                      src={ach.photoUrl}
                      alt={ach.recipientName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-100 group-hover:border-emerald-600 transition-colors shadow-sm"
                    />
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {ach.recipientName}
                      </h3>
                      <span className="text-xs text-emerald-700 font-semibold block">
                        SSC Batch &apos;{ach.batchYear}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-800 leading-snug">
                    {ach.title}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 text-xs font-semibold text-emerald-900 flex items-center justify-between">
                  <span>Conferred by {ach.organization}</span>
                  <Medal className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
