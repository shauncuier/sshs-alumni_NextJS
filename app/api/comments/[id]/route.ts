import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { deleteComment } from "@/lib/feed";
import { requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/comments/[id] — by its author, or by an admin or moderator.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in.");
    const id = (await params).id;
    const { postId, authorId } = await deleteComment(me, id);
    const own = authorId === me.id;
    await logActivity({ category: own ? "CONTENT" : "ADMIN", action: own ? "comment.deleted" : "comment.removed", summary: own ? `${me.email} deleted their comment` : `${me.email} removed a member's comment`, actor: me, targetType: "Comment", targetId: id, metadata: { postId, authorId }, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/comments/[id]");
  }
}
