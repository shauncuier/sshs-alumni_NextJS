"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleJobs, JobListing } from "@/lib/career-data";
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Building,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  PlusCircle,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobListing[]>(sampleJobs);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          if (data.jobs) setJobs(data.jobs);
        }
      } catch (err) {
        console.warn("Could not load from API, using local seed", err);
      }
    }
    loadJobs();
  }, []);

  const departments = [
    { label: "All Sectors", value: "ALL" },
    { label: "Engineering & Tech", value: "Engineering" },
    { label: "Clinical Medicine", value: "Clinical Medicine" },
    { label: "Shipping & Logistics", value: "Logistics" },
    { label: "Quality Assurance", value: "Quality Assurance" },
  ];

  const filteredJobs = jobs.filter((job) => {
    const matchesQuery =
      searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      selectedDept === "ALL" ||
      job.department.toLowerCase() === selectedDept.toLowerCase();

    const matchesType =
      selectedType === "ALL" ||
      job.workplaceType.toLowerCase() === selectedType.toLowerCase();

    return matchesQuery && matchesDept && matchesType;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* Hero Header */}
        <section className="bg-gradient-to-r from-[#06281e] via-[#043d2e] to-[#064e3b] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                  <Briefcase className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Alumni Professional Network</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  SSGHS Alumni Career Hub
                </h1>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  Discover career opportunities, internships, and executive openings posted exclusively by Sabuj Shikshayatan graduates across Bangladesh and global tech hubs.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/careers/new"
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post a Job for Alumni</span>
                </Link>

                <Link
                  href="/mentorship"
                  className="px-5 py-3 rounded-2xl bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-bold text-xs border border-emerald-600 transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Find a Senior Mentor</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search input */}
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by job title, company, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Workplace type */}
              <div className="md:col-span-3">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="ALL">All Workplaces</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              {/* Department */}
              <div className="md:col-span-3">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Job Listings Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Active Opportunities ({filteredJobs.length})
            </h2>
            <span className="text-xs text-slate-500">
              Priority consideration for SSGHS alumni candidates
            </span>
          </div>

          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-600 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Job Left Details */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {job.companyLogo ? (
                      <img
                        src={job.companyLogo}
                        alt={job.company}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <Building className="w-7 h-7 text-emerald-800" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        {job.title}
                      </h3>
                      {job.featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Featured
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {job.jobType}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{job.company}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.location} ({job.workplaceType})</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-700 font-bold">
                        {job.salaryRange}
                      </span>
                    </div>

                    {/* Posted by Alumnus Badge */}
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      <img
                        src={job.postedByAlumnus.avatarUrl}
                        alt={job.postedByAlumnus.name}
                        className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                      />
                      <span>
                        Posted by <strong>{job.postedByAlumnus.name}</strong> (SSC &apos;{String(job.postedByAlumnus.sscBatch).slice(-2)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Right Action */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="block text-[11px] text-slate-400">Apply before</span>
                    <span className="font-mono text-xs font-bold text-slate-700">{job.deadline}</span>
                  </div>

                  <Link
                    href={`/careers/${job.id}`}
                    className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <span>View &amp; Apply</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
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
