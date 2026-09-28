"use client";

import React, { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

// Every SSC batch the association covers, newest first.
const FIRST_SSC_BATCH = 1985;
const SSC_BATCH_YEARS = Array.from(
  { length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 },
  (_, i) => new Date().getFullYear() - i
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    sscBatch: "2010",
    rollNumber: "",
    section: "A",
    profession: "",
    company: "",
    city: "Chattogram",
    country: "Bangladesh",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          batchYear: formData.sscBatch,
          studentIdOrRoll: formData.rollNumber,
          section: formData.section,
          profession: formData.profession,
          company: formData.company,
          locationCity: formData.city,
          locationCountry: formData.country,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit registration.");
        setLoading(false);
      } else {
        setSubmitted(true);
        setLoading(false);
      }
    } catch {
      // Never report success unless the server saved the registration.
      setErrorMessage("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#041a13] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 right-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 text-center px-4">
        <Link href="/" className="inline-flex items-center justify-center group mb-3">
          <div className="w-16 h-16 rounded-full p-1 shadow-xl flex items-center justify-center ring-2 ring-amber-400/60 bg-white overflow-hidden group-hover:scale-105 transition-transform">
            <NextImage
              src="/logo.png"
              alt="SSGHS Alumni Association Official Crest"
              width={64}
              height={64}
              className="w-full h-full object-contain rounded-full"
              priority
            />
          </div>
        </Link>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Alumni Registration &amp; Verification
        </h2>
        <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-lg mx-auto">
          Sabuj Shikshayatan Government High School official member onboarding. Verify your enrollment records to receive a Verified Alumnus badge.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-emerald-800/40">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Registration Submitted!</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{formData.fullName}</strong>. Your registration for <strong>SSC Batch {formData.sscBatch}</strong> has been received and queued for committee verification against school records.
              </p>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 max-w-md mx-auto text-left space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> Verification Status: PENDING
                </div>
                <p className="text-[11px] text-emerald-800">
                  You can already sign in, update your profile, and browse public batch directories while administrative verification is in progress.
                </p>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Enter Alumni Portal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Section 1: Personal info */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  1. Personal &amp; Contact Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Full Name (as per SSC Certificate)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Md. Rahim Ahmed"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rahim@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+880 1700-000000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Account Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: School Records */}
              <div className="space-y-3 pt-3">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  2. School Academic Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      SSC Batch Year
                    </label>
                    <select
                      value={formData.sscBatch}
                      onChange={(e) => setFormData({ ...formData, sscBatch: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                    >
                      {SSC_BATCH_YEARS.map((year) => (
                        <option key={year} value={year.toString()}>
                          SSC Batch {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Class 10 Roll / ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1024"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Section
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="A">Section A (Morning)</option>
                      <option value="B">Section B (Day)</option>
                      <option value="Science">Science Cohort</option>
                      <option value="Commerce">Commerce / Arts</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Professional Info */}
              <div className="space-y-3 pt-3">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  3. Current Career &amp; Location
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Profession / Designation
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Software Engineer / Doctor"
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Microsoft / CMCH / Government"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      City of Residence
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chattogram / Dhaka / London"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bangladesh"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Verification Documents */}
              <div className="space-y-2 pt-3">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                  4. Verification Documents
                </span>
                <p className="text-[11px] text-slate-500">
                  Online document upload is not available yet. The committee checks your batch and roll
                  number against school records and will contact you by email or phone if they need your
                  SSC certificate, testimonial or school ID.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? "Submitting Registration..." : "Submit Alumni Registration"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

          <div className="mt-6 pt-4 text-center text-xs text-slate-600 border-t border-slate-100">
            <span>Already registered? </span>
            <Link href="/login" className="font-bold text-emerald-800 hover:underline">
              Member Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
