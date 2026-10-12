"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function NewJobForm() {

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  // Nothing preselected: the poster chooses each of these.
  const [location, setLocation] = useState("");
  const [workplaceType, setWorkplaceType] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [department, setDepartment] = useState("");
  // Empty unless the poster gives one; the job page then says "Negotiable".
  const [salaryRange, setSalaryRange] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  // Default deadline: 30 days from today.
  const [deadline, setDeadline] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          location,
          workplaceType,
          jobType,
          department,
          salaryRange,
          experienceLevel,
          description,
          requirements: requirements.split("\n").filter(Boolean),
          benefits: benefits.split("\n").filter(Boolean),
          deadline,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post job");

      setSubmitted(data.message || "Your job has been submitted.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to post job opening.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-12 border-b border-emerald-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Career Hub</span>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Post a Career Opportunity for SSGHS Alumni
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm">
              Empower your alma mater by hiring talented graduates and undergraduates directly from the SSGHS alumni pool.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-md">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Job submitted</h3>
                <p className="text-xs text-slate-600">{submitted}</p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Link href="/careers/mine" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                    My jobs &amp; applications
                  </Link>
                  <Link href="/careers" className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                    Back to the Career Hub
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="job-1" className="block font-semibold text-slate-700 mb-1">
                      Job / Internship Title *
                    </label>
                    <input id="job-1"
                      type="text"
                      required
                      placeholder="e.g. Senior Software Architect"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="job-2" className="block font-semibold text-slate-700 mb-1">
                      Hiring Company / Organization *
                    </label>
                    <input id="job-2"
                      type="text"
                      required
                      placeholder="e.g. NexGen Cloud Labs"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="job-3" className="block font-semibold text-slate-700 mb-1">
                      Department / Industry
                    </label>
                    <select id="job-3"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="" disabled>Choose…</option>
                      <option value="Engineering">Engineering &amp; Tech</option>
                      <option value="Clinical Medicine">Medical &amp; Healthcare</option>
                      <option value="Logistics">Shipping &amp; Logistics</option>
                      <option value="Finance">Banking &amp; Finance</option>
                      <option value="Management">Corporate &amp; HR</option>
                      <option value="General">Other / General</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-4" className="block font-semibold text-slate-700 mb-1">
                      Workplace Setting
                    </label>
                    <select id="job-4"
                      required
                      value={workplaceType}
                      onChange={(e) => setWorkplaceType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="" disabled>Choose…</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-5" className="block font-semibold text-slate-700 mb-1">
                      Job Type
                    </label>
                    <select id="job-5"
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="job-6" className="block font-semibold text-slate-700 mb-1">
                      Location
                    </label>
                    <input id="job-6"
                      type="text"
                      required
                      placeholder="e.g. Agrabad, Chattogram"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="job-experience" className="block font-semibold text-slate-700 mb-1">
                      Experience level
                    </label>
                    <select
                      id="job-experience"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {["Entry Level", "Mid Level", "Senior Level", "Executive"].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-7" className="block font-semibold text-slate-700 mb-1">
                      Estimated Salary / Stipend <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input id="job-7"
                      type="text"
                      placeholder="e.g. ৳80,000 - ৳1,20,000 BDT"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="job-8" className="block font-semibold text-slate-700 mb-1">
                      Application Deadline
                    </label>
                    <input id="job-8"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="job-9" className="block font-semibold text-slate-700 mb-1">
                    Job Overview &amp; Role Description *
                  </label>
                  <textarea id="job-9"
                    rows={4}
                    required
                    placeholder="Describe the role, day-to-day responsibilities, and team culture..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="job-10" className="block font-semibold text-slate-700 mb-1">
                      Candidate Requirements (one per line)
                    </label>
                    <textarea id="job-10"
                      rows={4}
                      placeholder="3+ years React experience&#10;Familiarity with REST APIs&#10;SSGHS graduate"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="job-11" className="block font-semibold text-slate-700 mb-1">
                      Benefits &amp; Perks (one per line)
                    </label>
                    <textarea id="job-11"
                      rows={4}
                      placeholder="Health insurance&#10;Festival bonuses (2x)&#10;Flexible hybrid hours"
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Link
                    href="/careers"
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit for review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
