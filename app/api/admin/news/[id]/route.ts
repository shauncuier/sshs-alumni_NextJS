import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { deleteNews, updateNews } from "@/lib/news";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Only administrators can manage news.");
  return me;
}

// PATCH /api/admin/news/[id] — edit, publish/unpublish or feature an article.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const { item, published } = await updateNews((await params).id, body, me.email);
    const action = published ? "news.published" : body.isPublished === false ? "news.unpublished" : "news.updated";
    await logActivity({
      category: "CONTENT",
      action,
      summary: `${action === "news.published" ? "Published" : action === "news.unpublished" ? "Unpublished" : "Edited"} news "${item.title}"`,
      actor: me,
      targetType: "NewsArticle",
      targetId: item.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ article: item });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/news/[id]");
  }
}

// DELETE /api/admin/news/[id] — remove an article and its image.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const removed = await deleteNews((await params).id);
    await logActivity({ category: "CONTENT", action: "news.deleted", summary: `Deleted news "${removed.title}"`, actor: me, targetType: "NewsArticle", targetId: removed.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/news/[id]");
  }
}
