import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { createAchievement, listAchievementsForAdmin, ACHIEVEMENT_CATEGORIES } from "@/lib/achievements";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const DENIED = "Only administrators can manage achievements.";

// GET /api/admin/achievements — every achievement, unpublished first.
export async function GET() {
  try {
    await requireArea("stories", DENIED);
    return NextResponse.json({ achievements: await listAchievementsForAdmin(), categories: ACHIEVEMENT_CATEGORIES });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/achievements");
  }
}

// POST /api/admin/achievements — add an achievement (unpublished unless isPublished is true).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const achievement = await createAchievement(await readJsonBody(req), me.email);
    await logActivity({ category: "CONTENT", action: achievement.isPublished ? "achievement.published" : "achievement.drafted", summary: `${achievement.isPublished ? "Published" : "Drafted"} achievement "${achievement.recipientName}: ${achievement.title}"`, actor: me, targetType: "Achievement", targetId: achievement.id, req });
    return NextResponse.json({ achievement }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/achievements");
  }
}
