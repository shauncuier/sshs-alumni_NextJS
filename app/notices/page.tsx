import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, FileText, Megaphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import { listActiveNotices, PRIORITY_BADGE } from "@/lib/notices";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/notices",
  image: null,
  title: "Notice board",
  description: "Official notices from Praktan Sabujian Parishad, the alumni association of Sabuj Shikshayatan Government High School, Sitakunda.",
});

export default async function NoticesPage() {
  const notices = await listActiveNotices().catch(() => []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<Megaphone className="w-3.5 h-3.5" />} eyebrow="নোটিশ বোর্ড" title="Notice board">
          Official notices from the executive committee.
        </PageHero>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          {notices.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm text-slate-600">There are no notices right now.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notices.map((n) => {
                const badge = PRIORITY_BADGE[n.priority];
                return (
                  <li key={n.id}>
                    <Link href={`/notices/${n.id}`} className="group block bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {n.date}</span>
                        {badge && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.className}`}>{badge.label}</span>}
                        {n.attachmentUrl && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF</span>}
                      </div>
                      <h2 className="mt-1.5 font-bold text-slate-900 group-hover:text-emerald-800 flex items-start justify-between gap-3">
                        <span>{n.title}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                      </h2>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1">{n.content}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
