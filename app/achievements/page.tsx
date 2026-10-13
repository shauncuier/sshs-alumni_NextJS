import type { Metadata } from "next";
import AchievementsClient from "@/components/achievements/AchievementsClient";
import { ACHIEVEMENT_CATEGORIES, listPublishedAchievements } from "@/lib/achievements";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("achievements"), path: "/achievements", title: "Alumni achievements", description: "Honours and achievements of former students of Sabuj Shikshayatan Government High School, Sitakunda, collected by the alumni association." });

// Published achievements only; unpublished ones never appear here.
export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  return <AchievementsClient achievements={await listPublishedAchievements()} allCategories={ACHIEVEMENT_CATEGORIES} />;
}
