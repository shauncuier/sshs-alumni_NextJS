import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap, Inbox, Send } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CancelRequest, MentorResponse } from "@/components/mentorship/RequestActions";
import { listMyMentorship } from "@/lib/mentorship";
import { getSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "My mentorship | SSGHS Alumni" };

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-rose-100 text-rose-800",
  CANCELLED: "bg-slate-200 text-slate-700",
};
const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });

// Requests a member received as a mentor, and requests they sent.
export default async function MyMentorshipPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/mentorship/mine");
  const { mentor, sent } = await listMyMentorship(me.id);
  const pendingIn = mentor?.requests.filter((r) => r.status === "PENDING").length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
          <Link href="/mentorship" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <ArrowLeft className="w-4 h-4" /> Mentorship
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">My mentorship</h1>

          {mentor ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-emerald-700" /> Requests to you {pendingIn > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">{pendingIn} new</span>}
                </h2>
                <Link href="/mentorship/become" className="text-xs font-bold text-emerald-800">Edit my mentor profile</Link>
              </div>
              {mentor.status !== "APPROVED" && (
                <p className="text-xs text-slate-500">
                  Your mentor profile is {mentor.status === "PENDING" ? "waiting for approval" : mentor.status === "PAUSED" ? "paused" : "not approved"}, so it is not listed right now.
                </p>
              )}
              {mentor.requests.length === 0 ? (
                <p className="text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 p-6 text-center">No requests yet.</p>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100">
                  {mentor.requests.map((r) => (
                    <div key={r.id} className="p-4 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE[r.status] ?? BADGE.PENDING}`}>{r.status}</span>
                        <span className="text-[11px] text-slate-400">{when(r.createdAt)}</span>
                      </div>
                      <p className="font-bold text-slate-900">
                        {r.menteeName}
                        {r.menteeBatch ? <span className="font-normal text-slate-500"> · SSC {r.menteeBatch}</span> : null} ·{" "}
                        <a href={`mailto:${r.menteeEmail}`} className="text-emerald-800 font-semibold">{r.menteeEmail}</a>
                      </p>
                      <p className="text-slate-700"><strong>Topic:</strong> {r.topic}{r.preferredTime ? ` · prefers ${r.preferredTime}` : ""}</p>
                      {r.message && <p className="text-slate-700 whitespace-pre-line">{r.message}</p>}
                      {r.status === "ACCEPTED" && r.meetingDetails && <p className="text-emerald-800"><strong>You shared:</strong> {r.meetingDetails}</p>}
                      {r.status === "PENDING" && <MentorResponse requestId={r.id} />}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-600">You are not a mentor. Experienced alumni can offer guidance to younger members.</p>
              <Link href="/mentorship/become" className="px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 w-fit">
                <GraduationCap className="w-4 h-4" /> Become a mentor
              </Link>
            </div>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-700" /> Your requests
            </h2>
            {sent.length === 0 ? (
              <p className="text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 p-6 text-center">
                You have not asked a mentor yet. <Link href="/mentorship" className="text-emerald-800 font-bold">Find a mentor</Link>
              </p>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100">
                {sent.map((r) => (
                  <div key={r.id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BADGE[r.status] ?? BADGE.PENDING}`}>{r.status}</span>
                      <span className="text-[11px] text-slate-400">{when(r.createdAt)}</span>
                    </div>
                    <p className="font-bold text-slate-900">{r.mentor.name} <span className="font-normal text-slate-500">· {r.mentor.designation}, {r.mentor.organization}</span></p>
                    <p className="text-slate-700"><strong>Topic:</strong> {r.topic}</p>
                    {r.status === "ACCEPTED" && r.meetingDetails && (
                      <p className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900"><strong>How to meet:</strong> {r.meetingDetails}</p>
                    )}
                    {r.mentorReply && <p className="text-slate-600 whitespace-pre-line"><strong>Mentor:</strong> {r.mentorReply}</p>}
                    {r.status === "PENDING" && <CancelRequest requestId={r.id} />}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
