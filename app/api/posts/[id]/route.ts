import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { deletePost } from "@/lib/feed";
import { requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

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
