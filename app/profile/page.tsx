"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import AlumniCard from "@/components/alumni/AlumniCard";
import { sampleAlumni, sampleBatches } from "@/lib/data";
import {
  BadgeCheck,
  Briefcase,
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  Globe,
  Share2,
  Edit,
  Heart,
  Calendar,
  Building,
  Award,
  Sparkles
} from "lucide-react";

export default function ProfilePage() {
  const currentAlumnus = sampleAlumni[0]; // Md. Jashedul Islam
  const sameBatchAlumni = sampleAlumni.filter((a) => a.id !== currentAlumnus.id && a.sscBatch === currentAlumnus.sscBatch);

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="My Profile" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Main Profile Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Cover Banner */}
            <div className="h-44 sm:h-56 bg-gradient-to-r from-emerald-950 via-emerald-800 to-[#041a13] relative overflow-hidden">
              <img
                src={currentAlumnus.coverUrl}
                alt="Profile Cover"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button className="px-3 py-1.5 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-colors">
                  <Share2 className="w-3.5 h-3.5" /> Share Profile
                </button>
              </div>
            </div>

            {/* Avatar & Header Details */}
            <div className="px-6 sm:px-8 pb-8 pt-0">
              <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div className="relative">
                  <img
                    src={currentAlumnus.avatarUrl}
                    alt={currentAlumnus.fullName}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white shadow-xl"
                  />
                  {currentAlumnus.isVerified && (
                    <span className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-white shadow" title="Verified Alumnus">
                      <BadgeCheck className="w-5 h-5 fill-emerald-600 text-white" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-end">
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </Link>
                  <Link
                    href="/messages"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    Send Message
                  </Link>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {currentAlumnus.fullName}
                  </h1>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300">
                    SSC Batch {currentAlumnus.sscBatch}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" /> Verified Member
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentAlumnus.profession} at {currentAlumnus.company}</span>
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {currentAlumnus.locationCity}, {currentAlumnus.locationCountry}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-800 font-semibold">
                    {currentAlumnus.connectionCount} Connections
                  </span>
                  <span>•</span>
                  <span>Joined October 2024</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Content Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Detailed Sections */}
            <div className="lg:col-span-8 space-y-6">
              {/* About / Bio */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">About</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {currentAlumnus.bio}
                </p>
              </div>

              {/* School Memories & Nostalgia */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>School Memories &amp; Nostalgia</span>
                </div>
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs sm:text-sm text-emerald-950 leading-relaxed italic">
                  &ldquo;{currentAlumnus.schoolMemories}&rdquo;
                </div>
              </div>

              {/* Career & Experience */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span>Experience &amp; Career Trajectory</span>
                </h3>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="pt-3 first:pt-0 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">Lead Software Architect</h4>
                    <div className="text-xs text-emerald-800 font-semibold">Grab / FinTech Solutions • Full-time</div>
                    <div className="text-[11px] text-slate-400">2021 — Present • 5 yrs</div>
                    <p className="text-xs text-slate-600 mt-1">
                      Architecting distributed financial checkout infrastructure, microservices latency reduction, and engineering leadership.
                    </p>
                  </div>

                  <div className="pt-3 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">Senior Full-Stack Engineer</h4>
                    <div className="text-xs text-slate-700 font-semibold">Enterprise Systems Ltd</div>
                    <div className="text-[11px] text-slate-400">2017 — 2021 • 4 yrs</div>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <span>Education</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100">
                  <div className="pt-2 first:pt-0">
                    <h4 className="font-bold text-sm text-slate-900">
                      B.Sc. in Computer Science &amp; Engineering
                    </h4>
                    <div className="text-xs text-slate-600">CUET / University of Chittagong</div>
                    <div className="text-[11px] text-slate-400">2009 — 2013</div>
                  </div>

                  <div className="pt-3">
                    <h4 className="font-bold text-sm text-slate-900">
                      Secondary School Certificate (SSC)
                    </h4>
                    <div className="text-xs text-emerald-800 font-semibold">
                      Sabuj Shikshayatan Government High School
                    </div>
                    <div className="text-[11px] text-slate-400">Class of 2008 • Science Group • GPA 5.0</div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">Skills &amp; Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {currentAlumnus.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 4 cols: Side widgets */}
            <div className="lg:col-span-4 space-y-6">
              {/* Batch Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                    &apos;08
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">SSC Batch 2008</h4>
                    <p className="text-[11px] text-slate-400">168 Alumni Members</p>
                  </div>
                </div>
                <Link
                  href="/batches/2008"
                  className="block text-center w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  View Batch Showcase
                </Link>
              </div>

              {/* Alumni Contributions */}
              <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-amber-300" />
                  <span>Alma Mater Impact</span>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  {currentAlumnus.contributions || "Donated to School Computer Lab & Scholarship Fund."}
                </p>
              </div>

              {/* People From the Same Batch */}
              {sameBatchAlumni.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    From SSC Batch 2008
                  </h4>
                  <div className="space-y-3">
                    {sameBatchAlumni.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={a.avatarUrl}
                            alt={a.fullName}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{a.fullName}</div>
                            <div className="text-[10px] text-slate-400">{a.profession}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
