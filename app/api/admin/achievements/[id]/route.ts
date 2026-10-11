import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { deleteAchievement, updateAchievement } from "@/lib/achievements";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };
const DENIED = "Only administrators can manage achievements.";

// PATCH /api/admin/achievements/[id] — edit, publish or unpublish an achievement.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const body = await readJsonBody(req);
    const { item, published } = await updateAchievement((await params).id, body, me.email);
    const action = published ? "achievement.published" : body.isPublished === false ? "achievement.unpublished" : "achievement.updated";
    const verb = action === "achievement.published" ? "Published" : action === "achievement.unpublished" ? "Unpublished" : "Edited";
    await logActivity({ category: "CONTENT", action, summary: `${verb} achievement "${item.recipientName}: ${item.title}"`, actor: me, targetType: "Achievement", targetId: item.id, metadata: { fields: Object.keys(body) }, req });
    return NextResponse.json({ achievement: item });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/achievements/[id]");
  }
}

// DELETE /api/admin/achievements/[id] — remove an achievement and its photo.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("stories", DENIED);
    const removed = await deleteAchievement((await params).id);
    await logActivity({ category: "CONTENT", action: "achievement.deleted", summary: `Deleted achievement "${removed.recipientName}: ${removed.title}"`, actor: me, targetType: "Achievement", targetId: removed.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/achievements/[id]");
  }
}
