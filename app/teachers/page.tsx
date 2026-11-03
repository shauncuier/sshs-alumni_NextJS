import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Portrait from "@/components/school/Portrait";
import { isShown, listSchoolPeople, type SchoolPersonView } from "@/lib/teachers";
import { schoolInfo } from "@/lib/data";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  image: shareCard("school"),
  path: "/teachers",
  title: "Our teachers",
  description: "The head teachers, teachers and office staff of Sabuj Shikshayatan Government High School, Sitakunda, from 1976 to today.",
});

// The list comes from the database (Admin → Teachers), so render on each request.
export const dynamic = "force-dynamic";

const chalk = "text-[#f4f1e8]";

export default async function TeachersPage() {
  const shown = (await listSchoolPeople().catch(() => [])).filter(isShown);
  const heads = shown.filter((p) => p.kind === "HEAD_TEACHER");
  const staffOrTeacher = shown.filter((p) => p.kind === "TEACHER" || p.kind === "STAFF");
  const today = {
    teachers: staffOrTeacher.filter((p) => p.kind === "TEACHER" && p.status === "CURRENT"),
    staff: staffOrTeacher.filter((p) => p.kind === "STAFF" && p.status === "CURRENT"),
  };
  const former = {
    teachers: staffOrTeacher.filter((p) => p.kind === "TEACHER" && p.status === "FORMER"),
    staff: staffOrTeacher.filter((p) => p.kind === "STAFF" && p.status === "FORMER"),
  };
  const inMemory = staffOrTeacher.filter((p) => p.status === "LATE");

  const jumps = [
    { href: "#head-teachers", label: "Head teachers", n: heads.length },
    { href: "#today", label: "At the school today", n: today.teachers.length + today.staff.length },
    { href: "#former", label: "Former teachers and staff", n: former.teachers.length + former.staff.length },
    { href: "#in-memory", label: "In memory", n: inMemory.length },
  ].filter((j) => j.n > 0);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* The blackboard: a classroom's first image, and the one flourish on this page. */}
        <section className="relative overflow-hidden bg-[#123d2f] border-b-8 border-[#8a5a2b]">
          <div aria-hidden className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_0.6px,transparent_0.6px)] [background-size:5px_5px]" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <h1 lang="bn" className={`${chalk} text-4xl sm:text-6xl font-black leading-tight max-w-3xl`}>
              যাঁদের হাতে আমাদের হাতেখড়ি
            </h1>
            <svg aria-hidden viewBox="0 0 420 18" className="w-64 sm:w-96 h-4 mt-2 text-amber-300/90" fill="none">
              <path d="M3 12 C 70 4, 140 15, 210 8 S 340 3, 417 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
            <p className="mt-6 text-lg sm:text-xl font-semibold text-emerald-50">Our teachers, from the first classes in {schoolInfo.established} to today</p>
            <p className="mt-2 text-sm text-emerald-100/75 max-w-xl leading-relaxed">
              Every head teacher, teacher and member of staff of {schoolInfo.name} we know of. Missing someone, or have a photo? Tell us.
            </p>
            {jumps.length > 1 && (
              <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {jumps.map((j) => (
                  <a key={j.href} href={j.href} className="group text-sm font-semibold text-emerald-50 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-amber-300 rounded">
                    <span className="text-2xl font-black text-amber-300 mr-1.5 tabular-nums">{j.n}</span>
                    <span className="underline decoration-emerald-500/50 underline-offset-4 group-hover:decoration-amber-300">{j.label}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
        </section>

        {heads.length > 0 && <HeadTeacherTimeline heads={heads} />}

        {(today.teachers.length > 0 || today.staff.length > 0) && (
          <Band id="today" bn="বর্তমান শিক্ষক ও কর্মচারী" en="At the school today" tone="white">
            <Group title="Teachers" list={today.teachers} />
            <Group title="Office staff" list={today.staff} />
          </Band>
        )}

        {(former.teachers.length > 0 || former.staff.length > 0) && (
          <Band id="former" bn="প্রাক্তন শিক্ষক ও কর্মচারী" en="Former teachers and staff" note="They have retired or moved on. We remember every one of them." tone="grey">
            <Group title="Teachers" list={former.teachers} />
            <Group title="Office staff" list={former.staff} />
          </Band>
        )}

        {inMemory.length > 0 && (
          <Band id="in-memory" bn="স্মরণে" en="In memory" note="Teachers and staff who have passed away. May they rest in peace." tone="dark">
            <Group list={inMemory} dark />
          </Band>
        )}

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-sm text-slate-600 leading-relaxed">
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

/** Head teachers in the order they served: a row on wide screens, a column on phones, today's head teacher last. */
function HeadTeacherTimeline({ heads }: { heads: SchoolPersonView[] }) {
  return (
    <section id="head-teachers" className="scroll-mt-20 bg-[#fbfbf8] border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <SectionTitle bn="প্রধান শিক্ষকবৃন্দ" en="Head teachers" note="In the order they led the school." />
        <ol className="relative mt-10 grid grid-cols-1 lg:grid-flow-col lg:auto-cols-fr gap-0 lg:gap-4">
          {/* The line that joins them. */}
          <span aria-hidden className="absolute left-[2.25rem] top-4 bottom-4 w-0.5 bg-emerald-200 lg:left-4 lg:right-4 lg:top-[4.5rem] lg:bottom-auto lg:h-0.5 lg:w-auto" />
          {heads.map((p) => {
            const now = p.status === "CURRENT";
            const late = p.status === "LATE";
            return (
              <li key={p.id} className="relative flex lg:flex-col items-center lg:items-center gap-4 lg:gap-3 py-3 lg:py-0 lg:text-center">
                <Portrait
                  person={p}
                  muted={late}
                  initialsClass="text-xl lg:text-4xl"
                  className={`relative shrink-0 w-[4.5rem] h-[4.5rem] lg:w-36 lg:h-36 rounded-full border-4 ${now ? "border-amber-400 ring-4 ring-amber-200" : "border-white ring-1 ring-emerald-200"} shadow-sm`}
                />
                <div className="min-w-0">
                  <p className={`text-sm font-black tabular-nums ${now ? "text-amber-700" : "text-emerald-700"}`}>
                    {p.tenure || "Years not known"}
                    {now && <span className="ml-2 inline-block rounded-full bg-amber-400 text-slate-950 text-[11px] px-2 py-0.5 align-middle">Head teacher now</span>}
                  </p>
                  <p lang="bn" className="text-base font-bold text-slate-900 leading-snug">{p.nameBn}</p>
                  {p.nameEn && <p className="text-xs text-slate-500">{p.nameEn}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Band({ id, bn, en, note, tone, children }: { id: string; bn: string; en: string; note?: string; tone: "white" | "grey" | "dark"; children: React.ReactNode }) {
  const bg = tone === "dark" ? "bg-[#123d2f]" : tone === "grey" ? "bg-slate-50 border-y border-slate-200" : "bg-white";
  return (
    <section id={id} className={`scroll-mt-20 ${bg}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-10">
        <SectionTitle bn={bn} en={en} note={note} dark={tone === "dark"} />
        {children}
      </div>
    </section>
  );
}

function SectionTitle({ bn, en, note, dark = false }: { bn: string; en: string; note?: string; dark?: boolean }) {
  return (
    <div>
      <h2 lang="bn" className={`text-3xl sm:text-4xl font-black ${dark ? chalk : "text-slate-900"}`}>{bn}</h2>
      <p className={`text-lg font-semibold ${dark ? "text-amber-300" : "text-emerald-800"}`}>{en}</p>
      {note && <p className={`text-sm mt-1 ${dark ? "text-emerald-100/75" : "text-slate-500"}`}>{note}</p>}
    </div>
  );
}

/** One group of people inside a band, e.g. today's teachers. Hidden when empty. */
function Group({ title, list, dark = false }: { title?: string; list: SchoolPersonView[]; dark?: boolean }) {
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

function TeacherCard({ person, dark }: { person: SchoolPersonView; dark: boolean }) {
  const late = person.status === "LATE";
  return (
    <figure>
      <Portrait person={person} muted={late} className={`w-full aspect-[4/5] rounded-xl ${dark ? "ring-1 ring-emerald-700" : "ring-1 ring-slate-200"}`} />
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
