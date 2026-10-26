import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, History, Landmark, ScrollText } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import CommitteeTree from "@/components/committee/CommitteeTree";
import { committeeTiers, getCurrentCommittee } from "@/lib/committee";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/committee",
  image: null,
  title: "Executive Committee",
  description: "The executive committee of Praktan Sabujian Parishad (প্রাক্তন সবুজিয়ান পরিষদ), the alumni association of Sabuj Shikshayatan Government High School, Sitakunda.",
});

export default async function CommitteePage() {
  const term = await getCurrentCommittee().catch(() => null);
  const members = term?.members ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<Landmark className="w-3.5 h-3.5" />} eyebrow={term ? `${term.startYear}${term.endYear ? `–${term.endYear}` : ""}` : "Executive Committee"} title={term?.title ?? "Executive Committee"}>
          The elected committee that runs the association: its events, membership, accounts and work for the school.
        </PageHero>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
          {members.length > 0 ? (
            <CommitteeTree tiers={committeeTiers(members)} />
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
              <Landmark className="w-10 h-10 text-emerald-700 mx-auto" />
              <h2 className="font-bold text-lg text-slate-900">The committee list is being finalised</h2>
              <p className="text-sm text-slate-600">The names of the executive committee will be published here soon.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/committee/past" className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-400">
              <History className="w-6 h-6 text-emerald-700 shrink-0" />
              <span className="flex-1 font-bold text-slate-900">Past committees</span>
              <ArrowRight className="w-4 h-4 text-emerald-700" />
            </Link>
            <Link href="/constitution" className="group bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-400">
              <ScrollText className="w-6 h-6 text-emerald-700 shrink-0" />
              <span className="flex-1 font-bold text-slate-900">Constitution</span>
              <ArrowRight className="w-4 h-4 text-emerald-700" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
