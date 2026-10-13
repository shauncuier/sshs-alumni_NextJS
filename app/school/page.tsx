import type { Metadata } from "next";
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { schoolInfo } from "@/lib/data";
import { GraduationCap, ExternalLink } from "lucide-react";
import { pageMetadata, shareCard } from "@/lib/seo";
import Picture from "@/components/shared/Picture";

export const metadata: Metadata = pageMetadata({ image: shareCard("school"), path: "/school", title: "The school since 1976", description: "Sabuj Shikshayatan Government High School (formerly Sabuj Shikshayatan High School), Hafiz Jute Mills, Sitakunda, Chattogram. Founded 1976, EIIN 105070." });

export default function SchoolPage() {
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
                {schoolInfo.bengaliName} — {schoolInfo.location}. EIIN {schoolInfo.eiin}. Established {schoolInfo.established}.
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
                  ["EIIN", schoolInfo.eiin],
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
              <p className="text-xs text-slate-500">EIIN {schoolInfo.eiin}.</p>
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
        </section>
      </main>

      <Footer />
    </div>
  );
}
