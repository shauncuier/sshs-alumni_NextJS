import React from "react";
import type { Metadata } from "next";
import { Download, ScrollText } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import { listConstitutions } from "@/lib/constitution";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/constitution",
  image: null,
  title: "Constitution",
  description: "The constitution of Praktan Sabujian Parishad (প্রাক্তন সবুজিয়ান পরিষদ) and its amendments, to download as PDF.",
});

export default async function ConstitutionPage() {
  const docs = await listConstitutions().catch(() => []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<ScrollText className="w-3.5 h-3.5" />} eyebrow="গঠনতন্ত্র" title="Constitution">
          The rules of the association: its aims, membership, committee and elections. Download the version you need.
        </PageHero>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-4">
          {docs.length === 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm text-slate-600">The constitution will be published here soon.</p>
            </div>
          )}
          {docs.map((d, i) => (
            <article key={d.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <ScrollText className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {d.year}
                  {i === 0 && docs.length > 1 ? " · latest" : ""}
                </p>
                <h2 className="text-lg font-bold text-slate-900">{d.title}</h2>
                {d.summary && <p className="text-sm text-slate-600 whitespace-pre-line">{d.summary}</p>}
              </div>
              <a href={d.fileUrl} target="_blank" rel="noopener" className="px-5 py-3 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0">
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
