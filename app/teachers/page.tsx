import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PersonTile from "@/components/school/PersonTile";
import { getSchoolPeople, type SchoolPersonView } from "@/lib/teachers";
import { schoolInfo } from "@/lib/data";
import { pageMetadata, shareCard } from "@/lib/seo";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  image: shareCard("school"),
  path: "/teachers",
  title: "Our teachers",
  description: "The head teachers, teachers and office staff of Sabuj Shikshayatan Government High School, Sitakunda, from 1976 to today.",
});

// The list comes from the database (Admin → Teachers), so render on each request.
export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const people = await getSchoolPeople().catch(() => ({ leaders: [], current: [], former: [], staff: [] }));
  const allSections: { id: string; bn: string; en: string; note?: string; list: SchoolPersonView[]; size?: "lg" }[] = [
    { id: "head-teachers", bn: "প্রধান শিক্ষকবৃন্দ", en: "Head teachers", note: "In the order they led the school.", list: people.leaders.filter((p) => p.kind === "HEAD_TEACHER"), size: "lg" },
    { id: "current", bn: "বর্তমান শিক্ষকবৃন্দ", en: "Teachers today", list: people.current },
    { id: "staff", bn: "অফিস স্টাফ", en: "Office staff", list: people.staff },
    { id: "former", bn: "প্রাক্তন শিক্ষকবৃন্দ", en: "Former teachers", note: "Teachers who have retired, moved on or passed away.", list: people.former },
  ];
  const sections = allSections.filter((s) => s.list.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        <section className="bg-[#06281e] text-white py-14 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
              <GraduationCap className="w-3.5 h-3.5" />
              <span lang="bn">শিক্ষকমণ্ডলী</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Our teachers</h1>
            <p className="text-emerald-100 text-sm leading-relaxed max-w-2xl">
              The people who taught us at {schoolInfo.name} ({schoolInfo.bengaliName}), from its first classes in {schoolInfo.established} until today.
            </p>
            {sections.length > 1 && (
              <nav aria-label="Sections" className="flex flex-wrap gap-2 pt-1">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 rounded-full bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-xs font-bold text-emerald-100">
                    {s.en} <span className="text-amber-300">{s.list.length}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-14">
          {sections.length === 0 && <p className="text-sm text-slate-500 text-center py-12">The list of teachers is coming soon.</p>}
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 space-y-6">
              <div className="space-y-1">
                <p lang="bn" className="text-xs font-bold uppercase tracking-wider text-emerald-700">{s.bn}</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {s.en} <span className="text-base font-semibold text-slate-400">({s.list.length})</span>
                </h2>
                {s.note && <p className="text-sm text-slate-500">{s.note}</p>}
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-3 ${s.size === "lg" ? "lg:grid-cols-4" : "lg:grid-cols-5"} gap-x-4 gap-y-8`}>
                {s.list.map((p) => (
                  <PersonTile key={p.id} person={p} size={s.size} />
                ))}
              </div>
            </section>
          ))}

          <p className="text-xs text-slate-500 text-center border-t border-slate-200 pt-8">
            Many photos are from the 2015 reunion souvenir. Missing someone, or have a better photo?{" "}
            <Link href="/contact" className="font-bold text-emerald-800 hover:text-emerald-700">
              Contact us
            </Link>
            . The founders and the school&apos;s story are on{" "}
            <Link href="/school#story" className="font-bold text-emerald-800 hover:text-emerald-700">
              Our school
            </Link>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
