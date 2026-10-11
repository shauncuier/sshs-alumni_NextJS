import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { createPost, listFeed } from "@/lib/feed";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// GET /api/posts?batch=&limit= — the community feed, newest first (pinned posts on
// top). Members only, like the /feed page.
export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to see the community feed.");
    const params = new URL(req.url).searchParams;
    const batch = Number(params.get("batch"));
    const limit = Number(params.get("limit"));
    const posts = await listFeed(me, { batch: Number.isInteger(batch) && batch > 0 ? batch : null, limit: limit > 0 ? limit : undefined });
    return NextResponse.json({ posts });
  } catch (err) {
    return errorResponse(err, "GET /api/posts");
  }
}

// POST /api/posts — a signed-in member posts to the feed. Never reports success unless it was stored.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "create-post", { limit: 10, windowMs: 10 * 60_000 });
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Unauthorized. Please sign in.");
    const post = await createPost(me, await readJsonBody(req));
    await logActivity({ category: "CONTENT", action: "post.created", summary: `${me.email} posted in the feed`, actor: me, targetType: "Post", targetId: post.id, metadata: { preview: post.content.slice(0, 80), batchTag: post.batchTag }, req });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/posts");
  }
}
