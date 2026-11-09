import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { schoolInfo } from "@/lib/data";
import { ArrowRight, GraduationCap, ExternalLink } from "lucide-react";
import { pageMetadata, shareCard } from "@/lib/seo";
import Picture from "@/components/shared/Picture";
import Link from "next/link";
import PersonTile from "@/components/school/PersonTile";
import { ANWAR_ALI_MOMENTS, SCHOOL_MEMOIRS, SCHOOL_STORY_TEASER } from "@/lib/school-history";
import { getSchoolPeople } from "@/lib/teachers";

export const metadata: Metadata = pageMetadata({ image: shareCard("school"), path: "/school", title: "The school since 1976", description: "Sabuj Shikshayatan Government High School (formerly Sabuj Shikshayatan High School), Hafiz Jute Mills, Sitakunda, Chattogram. Founded 1976," });

// The teachers come from the database (Admin → Teachers), so render on each request.
export const dynamic = "force-dynamic";

export default async function SchoolPage() {
  const people = await getSchoolPeople().catch(() => ({ leaders: [], current: [], former: [], staff: [] }));
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Our Alma Mater</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                About Sabuj Shikshayatan Government High School
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                {schoolInfo.bengaliName} — {schoolInfo.location}. Established {schoolInfo.established}.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                A Legacy of Educational Discipline &amp; Service
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The school was founded in {schoolInfo.established} as Sabuj Shikshayatan High School at Hafiz Jute Mills, Baro Aulia, in South
                Sonaichhari, Sitakunda. It teaches under the {schoolInfo.board} and became a government school in July 2025; its name is now{" "}
                {schoolInfo.name}.
              </p>
              <p lang="bn" className="text-sm text-slate-600 leading-relaxed">
                ১৯৭৬ সালে সীতাকুণ্ডের হাফিজ জুট মিলস এলাকায় সবুজ শিক্ষায়তন উচ্চ বিদ্যালয় নামে প্রতিষ্ঠিত বিদ্যালয়টি ২০২৫ সালে সরকারি হয়। এখন এর নাম{" "}
                {schoolInfo.bengaliName}।
              </p>

              {/* The facts people search for, in one place. */}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm pt-2">
                {[
                  ["Name", schoolInfo.name],
                  ["বাংলা নাম", schoolInfo.bengaliName],
                  ["Former name", "Sabuj Shikshayatan High School (সবুজ শিক্ষায়তন উচ্চ বিদ্যালয়)"],
                  ["Founded", String(schoolInfo.established)],
                  ["Government school since", "July 2025"],
                  ["Education board", schoolInfo.board],
                  ["Address", "Hafiz Jute Mills, Baro Aulia, South Sonaichhari, Sitakunda, Chattogram"],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-slate-200 pb-2">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{label}</dt>
                    <dd className="text-slate-800 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="pt-2">
                <a
                  href={schoolInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <span>Visit School Official Portal ({schoolInfo.website})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <Picture src="/about-school.jpg" alt={`${schoolInfo.name}: fifty batches since ${schoolInfo.established}`} sizes="(max-width: 1024px) 100vw, 40vw" className="w-full h-80 object-cover object-[center_85%]" />
            </div>
          </div>

          {/* Institutional Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-emerald-700 uppercase">Board Affiliation</span>
              <h3 className="font-bold text-base text-slate-900">{schoolInfo.board}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-emerald-700 uppercase">Established</span>
              <h3 className="font-bold text-base text-slate-900">{schoolInfo.established}</h3>
              <p className="text-xs text-slate-500">{new Date().getFullYear() - schoolInfo.established} years of students.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-emerald-700 uppercase">Location</span>
              <h3 className="font-bold text-base text-slate-900">Sitakunda, Chattogram</h3>
              <p className="text-xs text-slate-500">{schoolInfo.location}</p>
            </div>
          </div>

          {/* OUR STORY: two memoirs from the 2015 reunion souvenir */}
          <div id="story" className="scroll-mt-24 pt-6 border-t border-slate-200 space-y-6">
            <div className="space-y-1">
              <p lang="bn" className="text-xs font-bold uppercase tracking-wider text-emerald-700">আমাদের গল্প</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Our story: from a cowshed to a school</h2>
              <p className="text-sm text-slate-600">{SCHOOL_STORY_TEASER.en}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {SCHOOL_MEMOIRS.map((m) => (
                <article key={m.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
                  <header className="flex items-start gap-4">
                    {m.photo && (
                      <img loading="lazy" decoding="async" src={m.photo} alt={m.author} className="w-16 h-20 rounded-xl object-cover object-top ring-2 ring-amber-300/70 shrink-0" />
                    )}
                    <div lang="bn" className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">{m.title}</h3>
                      {m.subtitle && <p className="text-xs text-slate-500">{m.subtitle}</p>}
                      <p className="text-sm font-semibold text-emerald-800">
                        {m.author} <span className="font-normal text-slate-500">· {m.authorRole}</span>
                      </p>
                    </div>
                  </header>
                  <div lang="bn" className="space-y-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                    {m.paragraphs.slice(0, 2).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {m.paragraphs.length > 2 && (
                    <details className="group">
                      <summary lang="bn" className="cursor-pointer text-sm font-bold text-emerald-800 hover:text-emerald-700 list-none">
                        <span className="group-open:hidden">পুরোটা পড়ুন · Read all</span>
                        <span className="hidden group-open:inline">সংক্ষেপ করুন · Show less</span>
                      </summary>
                      <div lang="bn" className="space-y-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed mt-3">
                        {m.paragraphs.slice(2).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              ))}
            </div>
            <p className="text-xs text-slate-500">From the souvenir of the 2015 alumni reunion (পুনর্মিলনী ২০১৫).</p>
          </div>

          {/* FOUNDERS AND HEAD TEACHERS (Admin → Teachers) */}
          {people.leaders.length > 0 && (
            <div id="founders" className="scroll-mt-24 pt-6 border-t border-slate-200 space-y-6">
              <div className="space-y-1">
                <p lang="bn" className="text-xs font-bold uppercase tracking-wider text-emerald-700">প্রতিষ্ঠাতা ও প্রধান শিক্ষক</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Founders and head teachers</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                {people.leaders.map((p) => (
                  <PersonTile key={p.id} person={p} size="lg" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                {ANWAR_ALI_MOMENTS.map((src) => (
                  <img key={src} loading="lazy" decoding="async" src={src} alt="Anwar Ali Sir speaking at a school event" className="w-full h-56 sm:h-72 rounded-2xl object-cover object-top shadow-md" />
                ))}
                <p className="col-span-2 text-center text-xs text-slate-500">Anwar Ali Sir at a school event</p>
              </div>
            </div>
          )}

          {/* TEACHERS: the full list is on /teachers */}
          <div id="teachers" className="scroll-mt-24 pt-6 border-t border-slate-200">
            <Link href="/teachers" className="group flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-[#06281e] text-white p-6 sm:p-8 hover:bg-[#0b3d2c] transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[...people.current, ...people.former].filter((p) => p.photoUrl).slice(0, 5).map((p) => (
                    <img key={p.id} loading="lazy" decoding="async" src={p.photoUrl!} alt="" className="w-11 h-11 rounded-full object-cover object-top border-2 border-[#06281e]" />
                  ))}
                </div>
                <div>
                  <p lang="bn" className="text-xs font-bold text-amber-300">শিক্ষকমণ্ডলী</p>
                  <p className="text-lg sm:text-xl font-extrabold">Our teachers, today and before</p>
                  <p className="text-xs text-emerald-100/80">
                    {people.current.length} teaching today · {people.former.length} former teachers{people.staff.length > 0 ? ` · ${people.staff.length} office staff` : ""}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 group-hover:bg-amber-300 text-slate-950 font-black text-sm shrink-0">
                See all teachers <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
