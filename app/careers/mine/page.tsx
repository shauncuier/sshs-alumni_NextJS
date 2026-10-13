import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, ExternalLink, PlusCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CloseJobButton from "@/components/careers/CloseJobButton";
import { isOpen, listJobsByPoster } from "@/lib/jobs";
import { getSessionUser } from "@/lib/session-user";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ path: "/careers/mine", title: "My jobs", description: "Jobs you posted and their applications.", noindex: true });

const STATUS: Record<string, { label: string; style: string }> = {
  PENDING: { label: "Waiting for review", style: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Live", style: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Not approved", style: "bg-rose-100 text-rose-800" },
  CLOSED: { label: "Closed", style: "bg-slate-200 text-slate-700" },
};

// The jobs a member has posted, their review status and every application.
export default async function MyJobsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/careers/mine");
  const jobs = await listJobsByPoster(me.id);
  const now = new Date();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">My jobs &amp; applications</h1>
              <p className="text-xs text-slate-500 mt-0.5">New jobs are reviewed by the committee before they appear on the Career Hub.</p>
            </div>
            <Link href="/careers/new" className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Post a job
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">You have not posted any jobs yet</p>
            </div>
          ) : (
            jobs.map((job) => {
              const status =
                job.status === "APPROVED" && !isOpen(job, now)
                  ? { label: "Deadline passed", style: "bg-slate-200 text-slate-700" }
                  : STATUS[job.status] ?? STATUS.PENDING;
              return (
                <section key={job.id} className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.style}`}>{status.label}</span>
                      <h2 className="text-base font-bold text-slate-900 break-words">{job.title}</h2>
                      <p className="text-xs text-slate-500">
                        {job.company} · {job.location} · deadline {job.deadline.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}
                      </p>
                      {job.status === "REJECTED" && job.rejectReason && <p className="text-xs text-rose-700">Reason: {job.rejectReason}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {job.status === "APPROVED" && (
                        <Link href={`/careers/${job.id}`} className="px-3 py-2 min-h-[40px] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> View
                        </Link>
                      )}
                      {(job.status === "APPROVED" || job.status === "PENDING") && <CloseJobButton jobId={job.id} title={job.title} />}
                    </div>
                  </div>

                  <details open={job.applications.length > 0 && job.applications.length <= 5}>
                    <summary className="text-xs font-bold text-emerald-800 cursor-pointer select-none">
                      {job.applications.length} application{job.applications.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-2xl">
                      {job.applications.map((a) => (
                        <div key={a.id} className="p-3 text-xs space-y-1">
                          <p className="font-bold text-slate-900">
                            {a.name}
                            {a.sscBatch ? <span className="font-normal text-slate-500"> · SSC {a.sscBatch}</span> : null}
                          </p>
                          <p className="text-slate-600 break-all">
                            <a href={`mailto:${a.email}`} className="text-emerald-800 font-semibold">{a.email}</a>
                            {a.phone ? ` · ${a.phone}` : ""}
                          </p>
                          {a.resumeUrl && (
                            <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                              <ExternalLink className="w-3 h-3" /> CV
                            </a>
                          )}
                          {a.coverNote && <p className="text-slate-700 whitespace-pre-line">{a.coverNote}</p>}
                          <p className="text-[11px] text-slate-400">{a.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
