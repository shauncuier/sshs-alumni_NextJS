import React from "react";
import type { Metadata } from "next";
import { Medal } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import PersonCard from "@/components/shared/PersonCard";
import { groupHonorEntries, listHonorEntries } from "@/lib/honor-board";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/honor-board",
  image: null,
  title: "Honor board",
  description: "The honor board of Praktan Sabujian Parishad: the people who led and built the alumni association of Sabuj Shikshayatan Government High School, Sitakunda.",
});

export default async function HonorBoardPage() {
  const groups = groupHonorEntries(await listHonorEntries().catch(() => []));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<Medal className="w-3.5 h-3.5" />} eyebrow="সম্মাননা বোর্ড" title="Honor board">
          The people who led the association and served it with distinction.
        </PageHero>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
          {groups.length === 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm text-slate-600">The honor board will be published here soon.</p>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.honour} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Medal className="w-6 h-6 text-amber-500" /> {g.honour}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {g.entries.map((e) => (
                  <PersonCard key={e.id} name={e.name} role={e.period} details={[e.sscBatch ? `SSC ${e.sscBatch}` : null, e.note]} photoUrl={e.photoUrl} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
