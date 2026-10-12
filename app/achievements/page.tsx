import type { Metadata } from "next";
import AchievementsClient from "@/components/achievements/AchievementsClient";
import { ACHIEVEMENT_CATEGORIES, listPublishedAchievements } from "@/lib/achievements";

export const metadata: Metadata = {
  title: "Hall of fame",
  description: "Achievements of SSGHS alumni.",
};

// Published achievements only; unpublished ones never appear here.
export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  return <AchievementsClient achievements={await listPublishedAchievements()} allCategories={ACHIEVEMENT_CATEGORIES} />;
}
