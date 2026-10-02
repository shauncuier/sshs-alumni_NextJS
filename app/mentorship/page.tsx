"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleMentors, MentorProfile } from "@/lib/career-data";
import {
  GraduationCap,
  Star,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Video,
  X,
  Send,
  Building,
  MapPin,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface BookingResult {
  menteeEmail?: string;
  meetingLink?: string;
  [key: string]: unknown;
}

export default function MentorshipPage() {
  const [mentors] = useState<MentorProfile[]>(sampleMentors);
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [activeMentor, setActiveMentor] = useState<MentorProfile | null>(null);

  // Booking Form State
  // Prefill from the signed-in member; visitors start with empty fields.
  const { data: session } = useSession();
  const [menteeNameEdit, setMenteeName] = useState<string | null>(null);
  const menteeName = menteeNameEdit ?? (session?.user?.name ?? "");
  const [menteeEmailEdit, setMenteeEmail] = useState<string | null>(null);
  const menteeEmail = menteeEmailEdit ?? (session?.user?.email ?? "");
  const [menteeBatch, setMenteeBatch] = useState("2018");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [questions, setQuestions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const domains = [
    { label: "All Pathways", value: "ALL" },
    { label: "BCS & Civil Service", value: "BCS & Civil Service" },
    { label: "Medical & Surgery", value: "Medical & Surgery" },
    { label: "Software & AI", value: "Software & AI" },
    { label: "Higher Studies (US/EU)", value: "Higher Studies (US/EU)" },
  ];

  const filteredMentors = mentors.filter(
    (m) => selectedDomain === "ALL" || m.domain === selectedDomain
  );

  const handleOpenBooking = (mentor: MentorProfile) => {
    setActiveMentor(mentor);
    setSelectedTopic(mentor.topicsOffered[0] || "");
    setPreferredDate(mentor.availableDays[0] || "");
    setBookingResult(null);
  };

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentor) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/mentorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: activeMentor.id,
          mentorName: activeMentor.name,
          menteeName,
          menteeEmail,
          menteeBatch: parseInt(menteeBatch) || 2018,
          selectedTopic,
          preferredDate,
          questionsForMentor: questions,
        }),
      });

      const data = await res.json();
      setBookingResult(data.booking);
    } catch (err) {
      console.error("Booking failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-gradient-to-r from-[#06281e] via-[#043d2e] to-[#064e3b] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
              <span>Giving Forward to Future Generations</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              1-on-1 Alumni Mentorship Network
            </h1>
            <p className="text-emerald-100 text-sm max-w-3xl leading-relaxed">
              Connect directly with accomplished Sabuj Shikshayatan alumni in Bangladesh Civil Service, clinical medicine, international tech, and European academia for confidential career guidance.
            </p>
          </div>
        </section>

        {/* Domain Filter Pills */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/90 shadow-lg flex flex-wrap items-center gap-2">
            {domains.map((d) => {
              const isSelected = selectedDomain === d.value;
              return (
                <button
                  key={d.value}
                  onClick={() => setSelectedDomain(d.value)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Mentors Showcase Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-600 transition-all p-6 sm:p-7 shadow-xs hover:shadow-md flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Top: Avatar, Name, Batch */}
                  <div className="flex items-start gap-4">
                    <img
                      src={mentor.avatarUrl}
                      alt={mentor.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {mentor.domain}
                      </span>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">
                        {mentor.name}
                      </h3>
                      <div className="text-xs text-slate-600 font-semibold truncate">
                        {mentor.designation}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        SSC Batch {mentor.sscBatch} • {mentor.organization}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {mentor.bio}
                  </p>

                  {/* Skills Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mentor.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Topics Offered */}
                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs space-y-1.5">
                    <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider">
                      Popular Mentoring Topics:
                    </span>
                    {mentor.topicsOffered.map((topic, i) => (
                      <div key={i} className="flex items-center gap-2 text-emerald-800 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Metrics & Book Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{mentor.rating}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mentor.totalMenteesHelped} Mentees</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenBooking(mentor)}
                    className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book 1-on-1</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Booking Modal */}
        {activeMentor && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5 animate-scale-up">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Mentorship Booking
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    Session with {activeMentor.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    SSC Batch {activeMentor.sscBatch} • {activeMentor.organization}
                  </p>
                </div>
                <button
                  onClick={() => setActiveMentor(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {bookingResult ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      Mentorship Session Scheduled!
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Calendar invite and Google Meet link dispatched to {bookingResult.menteeEmail}.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono text-emerald-800 break-all">
                    <span className="font-bold block text-slate-600 text-[10px]">Google Meet Room:</span>
                    <a
                      href={bookingResult.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-emerald-700 hover:text-emerald-900"
                    >
                      {bookingResult.meetingLink}
                    </a>
                  </div>

                  <button
                    onClick={() => setActiveMentor(null)}
                    className="w-full py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookSession} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Topic of Discussion *
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {activeMentor.topicsOffered.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={menteeName}
                        onChange={(e) => setMenteeName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Your SSC Batch
                      </label>
                      <input
                        type="text"
                        required
                        value={menteeBatch}
                        onChange={(e) => setMenteeBatch(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={menteeEmail}
                        onChange={(e) => setMenteeEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Preferred Timing
                      </label>
                      <select
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        {activeMentor.availableDays.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Specific Questions or Background Summary
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Currently in 3rd year CSE. Planning to apply for DAAD Germany scholarship in 2027..."
                      value={questions}
                      onChange={(e) => setQuestions(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                    >
                      <Video className="w-4 h-4" />
                      <span>{isSubmitting ? "Coordinating..." : "Confirm Mentorship Session"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
