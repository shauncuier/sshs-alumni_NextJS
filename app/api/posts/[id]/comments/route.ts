import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { addComment, listComments } from "@/lib/feed";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// GET /api/posts/[id]/comments — the comments on a post, oldest first.
export async function GET(_req: Request, { params }: Params) {
  try {
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to see comments.");
    return NextResponse.json({ comments: await listComments(me, (await params).id) });
  } catch (err) {
    return errorResponse(err, "GET /api/posts/[id]/comments");
  }
}

// POST /api/posts/[id]/comments — { content } from a signed-in member.
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "create-comment", { limit: 30, windowMs: 10 * 60_000 });
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to comment.");
    const postId = (await params).id;
    const { content } = await readJsonBody(req);
    const comment = await addComment(me, postId, content);
    await logActivity({ category: "CONTENT", action: "comment.created", summary: `${me.email} commented on a post`, actor: me, targetType: "Post", targetId: postId, metadata: { commentId: comment.id, preview: comment.content.slice(0, 80) }, req });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/posts/[id]/comments");
  }
}
