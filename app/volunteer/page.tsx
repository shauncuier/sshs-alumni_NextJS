"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Utensils,
  HeartPulse,
  BookOpen,
  Music,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { SUBCOMMITTEES } from "@/lib/volunteers";

const ICONS_MAP: Record<string, React.ElementType> = {
  Sparkles,
  ShieldCheck,
  Utensils,
  HeartPulse,
  BookOpen,
  Music,
  GraduationCap,
  Users,
};

const FIRST_SSC_BATCH = 1985;
const BATCH_YEARS = Array.from(
  { length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 },
  (_, i) => new Date().getFullYear() - i
);

export default function VolunteerPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    sscBatch: "2015",
    subcommittee: SUBCOMMITTEES[0].id as string,
    skills: "",
    availability: "Dec 30 - 31 (All Event Days)",
    experience: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sscBatch: Number(formData.sscBatch),
          source: "PUBLIC_APPLICATION",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSubcommittee = SUBCOMMITTEES.find(
    (s) => s.id === formData.subcommittee
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#041a13] via-[#06281e] to-[#041a13] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold shadow-inner">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>SSGHS Organizing Committee Volunteer Wing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Serve Your Alma Mater with Pride
          </h1>
          <p className="text-base sm:text-lg text-emerald-200/90 max-w-2xl mx-auto font-medium leading-relaxed">
            Join the dedicated Alumni Volunteer Squad for upcoming mega reunions, Golden Jubilee galas, and ongoing association initiatives.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 8 Specialized Subcommittees
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Official Service Certificate
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Exclusive Volunteer Squad Pass
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Subcommittees info & Perks */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Organizing Subcommittees &amp; Wings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Select where your passion, expertise, or profession can contribute most effectively.
              </p>
            </div>

            {/* Subcommittees Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {SUBCOMMITTEES.map((sub) => {
                const Icon = ICONS_MAP[sub.icon] || Users;
                const isSelected = formData.subcommittee === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setFormData({ ...formData, subcommittee: sub.id })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? "bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/30 shadow-sm"
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 leading-snug">
                          {sub.name}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-800">
                          {sub.bengaliName}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                          {sub.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volunteer Recognition / Perks Box */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#06281e] to-[#041a13] text-white border border-emerald-900/80 shadow-md space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Volunteer Privileges &amp; Recognition</h3>
                  <p className="text-[11px] text-emerald-300/90">Honoring every alumnus giving back time and dedication</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2 bg-emerald-950/60 p-3 rounded-xl border border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Special Commendation Crest</strong>
                    <span className="text-slate-300 text-[11px]">Awarded during the grand closing ceremony by executive leaders.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-emerald-950/60 p-3 rounded-xl border border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">All-Access Security Pass</strong>
                    <span className="text-slate-300 text-[11px]">Volunteer Squad VIP pass granting campus control access.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-emerald-950/60 p-3 rounded-xl border border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Alumni Leadership Network</strong>
                    <span className="text-slate-300 text-[11px]">Direct priority consideration for future executive committees.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-emerald-950/60 p-3 rounded-xl border border-emerald-900/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">Squad Catering &amp; Kit</strong>
                    <span className="text-slate-300 text-[11px]">Dedicated volunteer meal pavilion, squad uniform &amp; kit.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Application Form */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm sticky top-24">
            {success ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Application Submitted!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for stepping forward to serve your school family. The Organizing Committee Secretariat has received your details and will get in touch with you shortly.
                </p>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-1">
                  <div className="text-slate-500 font-semibold">Selected Wing:</div>
                  <div className="font-bold text-emerald-900">{selectedSubcommittee?.name}</div>
                  <div className="text-slate-500">{selectedSubcommittee?.bengaliName}</div>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setFormData({
                        fullName: "",
                        email: "",
                        phone: "",
                        sscBatch: "2015",
                        subcommittee: SUBCOMMITTEES[0].id,
                        skills: "",
                        availability: "Dec 30 - 31 (All Event Days)",
                        experience: "",
                        notes: "",
                      });
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Submit Another Application
                  </button>
                  <Link
                    href="/events"
                    className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold text-center transition-colors"
                  >
                    Browse Upcoming Events
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                    Official Application Form
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">Volunteer Sign-Up</h3>
                  <p className="text-xs text-slate-500">
                    Open to all verified and aspiring alumni members.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Shakil Mahmud"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@domain.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mobile Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+880 1711-000000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        SSC Batch *
                      </label>
                      <select
                        value={formData.sscBatch}
                        onChange={(e) => setFormData({ ...formData, sscBatch: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {BATCH_YEARS.map((y) => (
                          <option key={y} value={y}>
                            SSC {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Subcommittee Wing *
                      </label>
                      <select
                        value={formData.subcommittee}
                        onChange={(e) => setFormData({ ...formData, subcommittee: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {SUBCOMMITTEES.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedSubcommittee && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900">
                      <strong>{selectedSubcommittee.name}</strong> ({selectedSubcommittee.bengaliName}): {selectedSubcommittee.description}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Professional Background / Skills
                    </label>
                    <input
                      type="text"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      placeholder="e.g. Doctor, Software Engineer, Event Host, Logistics"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Availability &amp; Shifts
                    </label>
                    <input
                      type="text"
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                      placeholder="e.g. Dec 30 Morning, Dec 31 Full Day, Any time needed"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Prior Organizing Experience / Equipment (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                      placeholder="e.g. Volunteered at 2020 reunion, can bring DSLR camera, sound gear"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Submitting Application..." : "Submit Volunteer Application"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  By submitting, you agree to coordinate with the SSGHS Executive Organizing Committee.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
