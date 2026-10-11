import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { deleteStory, updateStory } from "@/lib/stories";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };
const DENIED = "Only administrators can manage stories.";

// PATCH /api/admin/stories/[id] — edit, publish/unpublish or feature a story.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const body = await readJsonBody(req);
    const { item, published } = await updateStory((await params).id, body, me.email);
    const action = published ? "story.published" : body.isPublished === false ? "story.unpublished" : "story.updated";
    await logActivity({ category: "CONTENT", action, summary: `${action === "story.published" ? "Published" : action === "story.unpublished" ? "Unpublished" : "Edited"} story "${item.title}"`, actor: me, targetType: "AlumniStory", targetId: item.id, metadata: { fields: Object.keys(body) }, req });
    return NextResponse.json({ story: item });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/stories/[id]");
  }
}

// DELETE /api/admin/stories/[id] — remove a story and its cover image.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const removed = await deleteStory((await params).id);
    await logActivity({ category: "CONTENT", action: "story.deleted", summary: `Deleted story "${removed.title}"`, actor: me, targetType: "AlumniStory", targetId: removed.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/stories/[id]");
  }
}
