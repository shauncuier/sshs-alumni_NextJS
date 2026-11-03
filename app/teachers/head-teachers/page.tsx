import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { Band, HeadTeacherTimeline, SectionTitle, TeachersShell } from "@/components/teachers/TeacherParts";
import { EMPTY_DIRECTORY, getTeacherDirectory } from "@/lib/teachers";
import { schoolInfo } from "@/lib/data";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  image: shareCard("school"),
  path: "/teachers/head-teachers",
  title: "Former head teachers",
  description: "The head teachers of Sabuj Shikshayatan Government High School, Sitakunda, since 1976, in the order they led the school.",
});

export const dynamic = "force-dynamic";

export default async function FormerHeadTeachersPage() {
  const d = await getTeacherDirectory().catch(() => EMPTY_DIRECTORY);
  return (
    <TeachersShell active="/teachers/head-teachers" directory={d} lead={`Everyone who has led ${schoolInfo.name} since ${schoolInfo.established}, in the order they served.`}>
      <Band tone="grey">
        <SectionTitle as="h1" bn="সাবেক প্রধান শিক্ষক" en="Former head teachers" note="In the order they led the school." />
        {d.formerHeads.length > 0 ? <HeadTeacherTimeline heads={d.formerHeads} /> : <p className="text-sm text-slate-500">The former head teachers will be listed here soon.</p>}
        {d.currentHead && (
          <p className="text-sm text-slate-600">
            Today the school is led by{" "}
            <Link href="/teachers" className="font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-700">
              <span lang="bn">{d.currentHead.nameBn}</span>
            </Link>
            {d.currentHead.tenure ? `, head teacher since ${d.currentHead.tenure.replace(/\s*–\s*$/, "")}` : ""}.
          </p>
        )}
      </Band>
    </TeachersShell>
  );
}
