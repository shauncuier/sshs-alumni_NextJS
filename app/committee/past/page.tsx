import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import PersonCard from "@/components/shared/PersonCard";
import { listPastTerms } from "@/lib/committee";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/committee/past",
  image: null,
  title: "Past committees",
  description: "Earlier executive committees of Praktan Sabujian Parishad, the alumni association of Sabuj Shikshayatan Government High School, Sitakunda.",
});

export default async function PastCommitteesPage() {
  const terms = await listPastTerms().catch(() => []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<History className="w-3.5 h-3.5" />} eyebrow="Our history" title="Past committees">
          The members who served the association in earlier terms.
        </PageHero>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
          <Link href="/committee" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4" /> Current committee
          </Link>

          {terms.length === 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm text-slate-600">Earlier committees will be added here.</p>
            </div>
          )}

          {terms.map((t) => (
            <section key={t.id} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t.title} <span className="text-slate-500 font-bold text-base">({t.startYear}{t.endYear ? `–${t.endYear}` : ""})</span>
              </h2>
              {t.imageUrl ? (
                <img loading="lazy" decoding="async" src={t.imageUrl} alt={`${t.title}`} className="w-full rounded-3xl border border-slate-200 bg-white" />
              ) : t.members.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {t.members.map((m) => (
                    <PersonCard key={m.id} name={m.name} role={m.post} details={[m.sscBatch ? `SSC ${m.sscBatch}` : null]} photoUrl={m.photoUrl} />
                  ))}
                </div>
              ) : (
                <img loading="lazy" decoding="async" src="/placeholders/committee.svg" alt="" className="w-full max-w-2xl rounded-3xl border border-slate-200" />
              )}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
