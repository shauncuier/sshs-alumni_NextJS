import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Target, Eye, Users } from "lucide-react";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("about"), path: "/about", title: "About the association", description: "Who we are: Praktan Sabujian Parishad (প্রাক্তন সবুজিয়ান পরিষদ), the alumni association of Sabuj Shikshayatan Government High School, Sitakunda, and what it does for its members and the school." });

export default function AboutPage() {

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Users className="w-3.5 h-3.5" />
                <span>Executive Council &amp; Constitution</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                About Praktan Sabujian Parishad
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Founded to unite generations of former students of Sabuj Shikshayatan Government High School, uphold the school&apos;s educational prestige, and foster lifelong solidarity.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                To build an inclusive, collaborative community where former students of all batches can reconnect, mentor secondary school students, honor our teachers, and invest transparently in the academic excellence and infrastructural development of Sabuj Shikshayatan Government High School.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Our Vision</h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                To stand as one of Bangladesh&apos;s most active, impactful, and digitally integrated school alumni associations, setting high benchmarks in student merit scholarships, science innovation, healthcare support, and global community camaraderie.
              </p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { href: "/committee", label: "Executive committee", note: "Who runs the association now" },
              { href: "/constitution", label: "Constitution", note: "The rules, to download" },
              { href: "/honor-board", label: "Honor board", note: "Those who led before" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-colors">
                <p className="font-bold text-slate-900">{l.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{l.note}</p>
              </Link>
            ))}
          </div>

          <div className="mt-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Users className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <h2 className="font-bold text-lg text-slate-900">Contact the committee</h2>
                <p className="text-sm text-slate-600">Questions about membership, events or donations? Write to the association.</p>
              </div>
            </div>
            <Link href="/contact" className="px-5 py-3 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold text-center shrink-0">
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
