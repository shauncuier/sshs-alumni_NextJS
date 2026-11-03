import type { Metadata } from "next";
import React from "react";
import Portrait from "@/components/school/Portrait";
import { Band, Group, SectionTitle, TeachersShell } from "@/components/teachers/TeacherParts";
import { EMPTY_DIRECTORY, getTeacherDirectory } from "@/lib/teachers";
import { schoolInfo } from "@/lib/data";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  image: shareCard("school"),
  path: "/teachers",
  title: "Our teachers today",
  description: "The head teacher, assistant teachers and office staff of Sabuj Shikshayatan Government High School, Sitakunda, today.",
});

// The list comes from the database (Admin → Teachers), so render on each request.
export const dynamic = "force-dynamic";

export default async function TeachersTodayPage() {
  const d = await getTeacherDirectory().catch(() => EMPTY_DIRECTORY);
  const head = d.currentHead;
  return (
    <TeachersShell active="/teachers" directory={d} lead={`The head teacher, teachers and staff of ${schoolInfo.name} today. The tabs lead to everyone who taught there before.`}>
      <Band>
        <SectionTitle as="h1" bn="বর্তমান প্রধান শিক্ষক ও সহকারী শিক্ষক" en="At the school today" />
        {head && (
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-8 rounded-2xl bg-amber-50 border border-amber-200 p-5 sm:p-6">
            <Portrait person={head} initialsClass="text-5xl" className="w-40 sm:w-44 aspect-[4/5] rounded-xl ring-4 ring-amber-300 shrink-0" />
            <div className="text-center sm:text-left">
              <p lang="bn" className="text-sm font-bold text-amber-800">প্রধান শিক্ষক</p>
              <p lang="bn" className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{head.nameBn}</p>
              {head.nameEn && <p className="text-base font-semibold text-slate-700">{head.nameEn}</p>}
              <p className="text-sm text-slate-500 mt-1">Head teacher{head.tenure ? `, ${head.tenure.replace(/\s*–\s*$/, "")} to today` : ""}</p>
            </div>
          </div>
        )}
        <Group title="Assistant teachers" list={d.today.teachers} />
        <Group title="Office staff" list={d.today.staff} />
        {!head && d.today.teachers.length === 0 && d.today.staff.length === 0 && <p className="text-sm text-slate-500">Today&apos;s teachers will be listed here soon.</p>}
      </Band>
    </TeachersShell>
  );
}
