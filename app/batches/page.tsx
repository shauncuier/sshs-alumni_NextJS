import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BatchCard from "@/components/batches/BatchCard";
import { listBatches } from "@/lib/batches";
import { Layers } from "lucide-react";

// Every SSC batch with its real member count and the representative admins set.
export const dynamic = "force-dynamic";

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
                Explore Batches (1985 — {new Date().getFullYear()})
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Every batch has shaped the legacy of Sabuj Shikshayatan Government High School. Open your batch year to find classmates and your batch representative.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {batches.map((batch) => (
              <BatchCard key={batch.year} batch={batch} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
