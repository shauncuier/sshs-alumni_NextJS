"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { MentorProfile } from "@/lib/career-data";
import { Calendar, CheckCircle2, GraduationCap, Inbox, Send, Sparkles, Users, X } from "lucide-react";

const field = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600";

export default function MentorshipClient({
  mentors,
  domains,
  signedIn,
  ownMentorId,
}: {
  mentors: MentorProfile[];
  domains: readonly string[];
  signedIn: boolean;
  /** The signed-in member's own mentor profile, if listed, so they cannot request themselves. */
  ownMentorId: string | null;
}) {
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [activeMentor, setActiveMentor] = useState<MentorProfile | null>(null);
  const [topic, setTopic] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMentors = mentors.filter((m) => selectedDomain === "ALL" || m.domain === selectedDomain);

  const openRequest = (mentor: MentorProfile) => {
    setActiveMentor(mentor);
    setTopic(mentor.topicsOffered[0] || "");
    setPreferredTime(mentor.availableDays[0] || "");
    setMessage("");
    setSent(false);
    setError(null);
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentor) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/mentorship/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId: activeMentor.id, topic, preferredTime, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your request.");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        <section className="bg-gradient-to-r from-[#06281e] via-[#043d2e] to-[#064e3b] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
                <span>Giving Forward to Future Generations</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">1-on-1 Alumni Mentorship Network</h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Ask experienced Sabuj Shikshayatan alumni for career guidance. Send a request; the mentor replies by email with how and when to meet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/mentorship/become" className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs flex items-center gap-2 shadow-lg">
                <GraduationCap className="w-4 h-4" /> Become a mentor
              </Link>
              {signedIn && (
                <Link href="/mentorship/mine" className="px-5 py-3 rounded-2xl bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-bold text-xs border border-emerald-600 flex items-center gap-2">
                  <Inbox className="w-4 h-4" /> My mentorship
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/90 shadow-lg flex flex-wrap items-center gap-2">
            {["ALL", ...domains].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDomain(d)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${selectedDomain === d ? "bg-emerald-800 text-white shadow-md" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                {d === "ALL" ? "All Pathways" : d}
              </button>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          {filteredMentors.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">{mentors.length === 0 ? "No mentors listed yet" : "No mentors in this field yet"}</p>
              <p className="text-xs text-slate-500 mt-1">Verified members can offer to mentor; the committee approves each profile.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map((mentor) => (
                <div key={mentor.id} className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-600 transition-all p-6 sm:p-7 shadow-xs hover:shadow-md flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <img src={mentor.avatarUrl} alt={mentor.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">{mentor.domain}</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 truncate">{mentor.name}</h3>
                        <div className="text-xs text-slate-600 font-semibold truncate">{mentor.designation}</div>
                        <div className="text-[11px] text-slate-400">
                          {mentor.sscBatch ? `SSC Batch ${mentor.sscBatch} • ` : ""}
                          {mentor.organization} • {mentor.yearsOfExperience} yrs
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">{mentor.bio}</p>
                    {mentor.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {mentor.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700">{skill}</span>
                        ))}
                      </div>
                    )}
                    <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs space-y-1.5">
                      <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider">Can help with:</span>
                      {mentor.topicsOffered.map((t) => (
                        <div key={t} className="flex items-center gap-2 text-emerald-800 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mentor.totalMenteesHelped} mentee{mentor.totalMenteesHelped === 1 ? "" : "s"} helped</span>
                    </div>
                    {mentor.id === ownMentorId ? (
                      <span className="text-[11px] font-bold text-slate-400">Your profile</span>
                    ) : signedIn ? (
                      <button onClick={() => openRequest(mentor)} className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer">
                        <Calendar className="w-3.5 h-3.5" /> Request mentorship
                      </button>
                    ) : (
                      <Link href="/login?callbackUrl=/mentorship" className="px-4 py-2.5 border border-emerald-700 text-emerald-800 rounded-xl font-bold text-xs">
                        Sign in to request
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {activeMentor && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setActiveMentor(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Request mentorship from ${activeMentor.name}`}
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Mentorship request</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{activeMentor.name}</h3>
                  <p className="text-xs text-slate-500">{activeMentor.designation} • {activeMentor.organization}</p>
                </div>
                <button onClick={() => setActiveMentor(null)} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {sent ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Request sent</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {activeMentor.name} has been emailed. When they accept, you get an email with how and when to meet. You can follow it in My mentorship.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/mentorship/mine" className="py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">My mentorship</Link>
                    <button onClick={() => setActiveMentor(null)} className="py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer">Done</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={sendRequest} className="space-y-3.5 text-xs">
                  <div>
                    <label htmlFor="mr-topic" className="block font-semibold text-slate-700 mb-1">Topic *</label>
                    <select id="mr-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={field}>
                      {activeMentor.topicsOffered.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="mr-time" className="block font-semibold text-slate-700 mb-1">Preferred time</label>
                    <input id="mr-time" list="mr-days" maxLength={120} value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className={field} placeholder="e.g. Friday evening" />
                    <datalist id="mr-days">
                      {activeMentor.availableDays.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="mr-msg" className="block font-semibold text-slate-700 mb-1">Your question or background</label>
                    <textarea id="mr-msg" rows={4} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} className={field} placeholder="e.g. Final-year CSE student planning to apply for a DAAD scholarship in 2027…" />
                  </div>
                  <p className="text-[11px] text-slate-500">Your name, batch and email from your account are shared with the mentor.</p>
                  {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
                  <button type="submit" disabled={isSubmitting || !topic} className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                    <Send className="w-4 h-4" /> {isSubmitting ? "Sending…" : "Send request"}
                  </button>
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
