import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Portrait from "@/components/school/Portrait";
import type { SchoolPersonView, TeacherDirectory } from "@/lib/teachers";

// The three /teachers pages share the blackboard header, the tabs between them and the cards.

export const chalk = "text-[#f4f1e8]";

const TABS = [
  { href: "/teachers", bn: "বর্তমান শিক্ষক ও কর্মচারী", en: "Today", count: (d: TeacherDirectory) => (d.currentHead ? 1 : 0) + d.today.teachers.length + d.today.staff.length },
  { href: "/teachers/head-teachers", bn: "সাবেক প্রধান শিক্ষক", en: "Former head teachers", count: (d: TeacherDirectory) => d.formerHeads.length },
  { href: "/teachers/former", bn: "সাবেক শিক্ষক ও কর্মচারী", en: "Former teachers and staff", count: (d: TeacherDirectory) => d.former.teachers.length + d.former.staff.length + d.inMemory.length },
];

export function TeachersShell({ active, directory, lead, children }: { active: string; directory: TeacherDirectory; lead: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        {/* The blackboard: the one flourish on these pages. */}
        <section className="relative overflow-hidden bg-[#123d2f]">
          <div aria-hidden className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:5px_5px]" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
            <p lang="bn" className={`${chalk} text-3xl sm:text-5xl font-black leading-tight`}>যাঁদের হাতে আমাদের হাতেখড়ি</p>
            <svg aria-hidden viewBox="0 0 420 18" className="w-56 sm:w-80 h-4 mt-1 text-amber-300/90" fill="none">
              <path d="M3 12 C 70 4, 140 15, 210 8 S 340 3, 417 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <p className="mt-4 text-sm sm:text-base text-emerald-100/85 max-w-2xl leading-relaxed">{lead}</p>
            <nav aria-label="Teachers" className="mt-8 grid grid-cols-3 gap-1 sm:flex sm:gap-2">
              {TABS.map((t) => {
                const on = t.href === active;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={on ? "page" : undefined}
                    className={`sm:shrink-0 rounded-t-xl px-2.5 sm:px-5 pt-3 pb-3.5 focus-visible:outline-2 focus-visible:outline-amber-300 ${
                      on ? "bg-white text-slate-900" : "bg-emerald-900/60 text-emerald-50 hover:bg-emerald-800"
                    }`}
                  >
                    <span lang="bn" className="block text-xs sm:text-base font-bold leading-snug sm:whitespace-nowrap">{t.bn}</span>
                    <span className={`block text-[11px] sm:text-xs mt-0.5 ${on ? "text-emerald-700" : "text-emerald-200/80"}`}>
                      <span className="hidden sm:inline">{t.en} </span><span className="font-bold tabular-nums">({t.count(directory)})</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>
        {children}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-sm text-slate-600 leading-relaxed border-t border-slate-200">
          <p>
            Many photos come from the 2015 reunion souvenir, so some are old. To add a teacher, correct a name or send a better photo,{" "}
            <Link href="/contact" className="font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-700">write to us</Link>. The founders and the
            story of how the school began are on <Link href="/school#story" className="font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-700">Our school</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function SectionTitle({ bn, en, note, dark = false, as: H = "h2" }: { bn: string; en: string; note?: string; dark?: boolean; as?: "h1" | "h2" }) {
  return (
    <div>
      <H lang="bn" className={`text-3xl sm:text-4xl font-black ${dark ? chalk : "text-slate-900"}`}>{bn}</H>
      <p className={`text-lg font-semibold ${dark ? "text-amber-300" : "text-emerald-800"}`}>{en}</p>
      {note && <p className={`text-sm mt-1 ${dark ? "text-emerald-100/75" : "text-slate-500"}`}>{note}</p>}
    </div>
  );
}

export function Band({ id, tone = "white", children }: { id?: string; tone?: "white" | "grey" | "dark"; children: React.ReactNode }) {
  const bg = tone === "dark" ? "bg-[#123d2f]" : tone === "grey" ? "bg-slate-50 border-t border-slate-200" : "bg-white";
  return (
    <section id={id} className={`scroll-mt-20 ${bg}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-10">{children}</div>
    </section>
  );
}

/** One group of people, e.g. today's assistant teachers. Hidden when empty. */
export function Group({ title, list, dark = false }: { title?: string; list: SchoolPersonView[]; dark?: boolean }) {
  if (list.length === 0) return null;
  return (
    <div className="space-y-5">
      {title && (
        <h3 className={`text-sm font-bold pb-2 border-b ${dark ? "text-emerald-50 border-emerald-700" : "text-slate-700 border-slate-200"}`}>
          {title} <span className={dark ? "text-emerald-300" : "text-slate-400"}>({list.length})</span>
        </h3>
      )}
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
        {list.map((p) => (
          <li key={p.id}>
            <TeacherCard person={p} dark={dark} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeacherCard({ person, dark = false }: { person: SchoolPersonView; dark?: boolean }) {
  return (
    <figure>
      <Portrait person={person} muted={person.status === "LATE"} className={`w-full aspect-[4/5] rounded-xl ${dark ? "ring-1 ring-emerald-700" : "ring-1 ring-slate-200"}`} />
      <figcaption className="mt-2.5">
        <p lang="bn" className={`text-sm font-bold leading-snug ${dark ? chalk : "text-slate-900"}`}>{person.nameBn}</p>
        {person.nameEn && <p className={`text-xs ${dark ? "text-emerald-100/80" : "text-slate-600"}`}>{person.nameEn}</p>}
        <p className={`text-xs ${dark ? "text-emerald-300/80" : "text-slate-400"}`}>
          {person.roleEn || person.roleBn}
          {person.tenure ? `, ${person.tenure}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

/** Head teachers in the order they served: a row on wide screens, a column on phones. */
export function HeadTeacherTimeline({ heads }: { heads: SchoolPersonView[] }) {
  return (
    <ol className="relative grid grid-cols-1 lg:grid-flow-col lg:auto-cols-fr gap-0 lg:gap-4">
      <span aria-hidden className="absolute left-[2.25rem] top-4 bottom-4 w-0.5 bg-emerald-200 lg:left-4 lg:right-4 lg:top-[4.5rem] lg:bottom-auto lg:h-0.5 lg:w-auto" />
      {heads.map((p) => (
        <li key={p.id} className="relative flex lg:flex-col items-center gap-4 lg:gap-3 py-3 lg:py-0 lg:text-center">
          <Portrait
            person={p}
            muted={p.status === "LATE"}
            initialsClass="text-xl lg:text-4xl"
            className="relative shrink-0 w-[4.5rem] h-[4.5rem] lg:w-36 lg:h-36 rounded-full border-4 border-white ring-1 ring-emerald-200 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-black tabular-nums text-emerald-700">{p.tenure || "Years not known"}</p>
            <p lang="bn" className="text-base font-bold text-slate-900 leading-snug">{p.nameBn}</p>
            {p.nameEn && <p className="text-xs text-slate-500">{p.status === "LATE" ? `Late ${p.nameEn}` : p.nameEn}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
