import type { Metadata } from "next";
import React from "react";
import { Band, Group, SectionTitle, TeachersShell } from "@/components/teachers/TeacherParts";
import { EMPTY_DIRECTORY, getTeacherDirectory } from "@/lib/teachers";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  image: shareCard("school"),
  path: "/teachers/former",
  title: "Former teachers and staff",
  description: "The former assistant teachers and office staff of Sabuj Shikshayatan Government High School, Sitakunda, and those who have passed away.",
});

export const dynamic = "force-dynamic";

export default async function FormerTeachersPage() {
  const d = await getTeacherDirectory().catch(() => EMPTY_DIRECTORY);
  const any = d.former.teachers.length + d.former.staff.length > 0;
  return (
    <TeachersShell active="/teachers/former" directory={d} lead="The assistant teachers and staff who have retired or moved on, and those who are no longer with us. We remember every one of them.">
      <Band>
        <SectionTitle as="h1" bn="সাবেক সহকারী শিক্ষক ও কর্মচারী" en="Former teachers and staff" />
        <Group title="Assistant teachers" list={d.former.teachers} />
        <Group title="Office staff" list={d.former.staff} />
        {!any && <p className="text-sm text-slate-500">The former teachers will be listed here soon.</p>}
      </Band>
      {d.inMemory.length > 0 && (
        <Band id="in-memory" tone="dark">
          <SectionTitle bn="স্মরণে" en="In memory" note="Teachers and staff who have passed away. May they rest in peace." dark />
          <Group list={d.inMemory} dark />
        </Band>
      )}
    </TeachersShell>
  );
}
