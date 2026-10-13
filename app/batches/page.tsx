import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BatchGrid from "@/components/batches/BatchGrid";
import { listBatches } from "@/lib/batches";
import { Layers } from "lucide-react";
import { pageMetadata, shareCard } from "@/lib/seo";

// Every SSC batch with its real member count and the representative admins set.
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ image: shareCard("batches"), path: "/batches", title: "SSC batches since 1977", description: "Find your SSC batch at Sabuj Shikshayatan Government High School: classmates, the batch representative and reunion news for every year since 1977." });

export default async function BatchesPage() {
  const batches = await listBatches();
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Layers className="w-3.5 h-3.5" />
                <span>Classroom Chronicles</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Explore batches
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Every batch has shaped the legacy of Sabuj Shikshayatan Government High School. Open your batch year to find classmates and your batch representative.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <BatchGrid batches={batches} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
