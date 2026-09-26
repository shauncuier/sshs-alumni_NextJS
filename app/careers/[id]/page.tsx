"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleJobs } from "@/lib/career-data";
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Building,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Send,
  Calendar,
  Share2
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const job = sampleJobs.find((j) => j.id === id) || sampleJobs[0];

  const [applicantName, setApplicantName] = useState("Md. Jashedul Islam");
  const [applicantEmail, setApplicantEmail] = useState("jashedul@example.com");
  const [applicantPhone, setApplicantPhone] = useState("+880 1712-345678");
  const [applicantBatch, setApplicantBatch] = useState("2008");
  const [resumeUrl, setResumeUrl] = useState("https://drive.google.com/sample-resume-jashedul.pdf");
  const [coverNote, setCoverNote] = useState("Proud alumnus of SSGHS Batch 2008. Excited to contribute to NexGen Cloud Labs.");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName,
          applicantEmail,
          applicantPhone,
          applicantBatch: parseInt(applicantBatch) || 2008,
          resumeUrl,
          coverNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Top Header */}
        <section className="bg-[#06281e] text-white py-12 border-b border-emerald-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Career Hub</span>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white p-2.5 flex items-center justify-center shrink-0 shadow-lg">
                  {job.companyLogo ? (
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Building className="w-8 h-8 text-emerald-800" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {job.title}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                      {job.jobType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200">
                    <span className="font-semibold text-white">{job.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{job.location} ({job.workplaceType})</span>
                    </span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">{job.salaryRange}</span>
                  </div>
                </div>
              </div>

              {/* Recruiter Alumnus Mini Badge */}
              <div className="bg-emerald-900/60 p-3.5 rounded-2xl border border-emerald-700/60 flex items-center gap-3">
                <img
                  src={job.postedByAlumnus.avatarUrl}
                  alt={job.postedByAlumnus.name}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400"
                />
                <div>
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                    Alumni Hiring Contact
                  </span>
                  <div className="font-bold text-xs text-white">
                    {job.postedByAlumnus.name}
                  </div>
                  <div className="text-[11px] text-emerald-200">
                    Batch {job.postedByAlumnus.sscBatch} • {job.postedByAlumnus.designation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content & Form Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left 7 cols: Job Details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                    About This Opportunity
                  </h2>
                  <p className="leading-relaxed text-slate-600">
                    {job.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">
                    Key Requirements
                  </h3>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-3">
                    Benefits &amp; Perks
                  </h3>
                  <ul className="space-y-2">
                    {job.benefits.map((ben, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{ben}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Application Deadline: <strong>{job.deadline}</strong></span>
                  </div>
                  <div>
                    <span>{job.applicationCount} Alumni Applicants</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Application Form */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl sticky top-24 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Direct Alumnus Application
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Apply with SSGHS Credentials
                  </h3>
                </div>

                {submitted ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-slate-800">
                      Application Submitted!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your resume and cover note have been routed directly to {job.postedByAlumnus.name}. You will be contacted via email/phone if shortlisted.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Update / Resubmit Application
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="space-y-3.5 text-xs">
                    {errorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                        {errorMsg}
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          SSC Batch
                        </label>
                        <input
                          type="text"
                          required
                          value={applicantBatch}
                          onChange={(e) => setApplicantBatch(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Resume / Portfolio Link (Google Drive / LinkedIn / GitHub)
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://..."
                        value={resumeUrl}
                        onChange={(e) => setResumeUrl(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Brief Note to Alumnus Recruiter
                      </label>
                      <textarea
                        rows={3}
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? "Transmitting..." : "Submit Application to Recruiter"}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
