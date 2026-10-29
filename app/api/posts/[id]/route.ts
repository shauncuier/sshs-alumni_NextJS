import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { deletePost, updatePost } from "@/lib/feed";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/posts/[id] { content, batchTag? } — edit the text, by its author or by an
// admin or moderator. The post keeps its date; the edit time is shown next to it.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const id = (await params).id;
    const post = await updatePost(me, id, await readJsonBody(req));
    const own = post.authorId === me.id;
    await logActivity({
      category: own ? "CONTENT" : "ADMIN",
      action: own ? "post.edited" : "post.edited_by_staff",
      summary: own ? `${me.email} edited their post` : `${me.email} edited a member's post`,
      actor: me,
      targetType: "Post",
      targetId: id,
      metadata: { authorId: post.authorId, preview: post.content.slice(0, 80), batchTag: post.batchTag },
      req,
    });
    return NextResponse.json({ post });
  } catch (err) {
    return errorResponse(err, "PATCH /api/posts/[id]");
  }
}

// DELETE /api/posts/[id] — by its author, or by an admin or moderator.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const id = (await params).id;
    const { authorId, preview } = await deletePost(me, id);
    const own = authorId === me.id;
    await logActivity({
      category: own ? "CONTENT" : "ADMIN",
      action: own ? "post.deleted" : "post.removed",
      summary: own ? `${me.email} deleted their post` : `${me.email} removed a member's post`,
      actor: me,
      targetType: "Post",
      targetId: id,
      metadata: { authorId, preview },
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/posts/[id]");
  }
}
