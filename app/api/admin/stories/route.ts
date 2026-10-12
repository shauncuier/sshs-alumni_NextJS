import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { createStory, listStoriesForAdmin } from "@/lib/stories";
import { readJsonBody, LARGE_JSON_BYTES, requireSameOrigin } from "@/lib/request-security";

const DENIED = "Only administrators can manage stories.";

// GET /api/admin/stories — every story, drafts first.
export async function GET() {
  try {
    await requireArea("stories", DENIED);
    return NextResponse.json({ stories: await listStoriesForAdmin() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/stories");
  }
}

// POST /api/admin/stories — write a story (a draft unless isPublished is true).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const story = await createStory(await readJsonBody(req, LARGE_JSON_BYTES), me.email);
    await logActivity({ category: "CONTENT", action: story.isPublished ? "story.published" : "story.drafted", summary: `${story.isPublished ? "Published" : "Drafted"} story "${story.title}"`, actor: me, targetType: "AlumniStory", targetId: story.id, req });
    return NextResponse.json({ story }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/stories");
  }
}
