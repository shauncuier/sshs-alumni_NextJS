import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { toggleLike } from "@/lib/feed";
import { requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// POST /api/posts/[id]/like — like the post, or remove the like. Likes are not
// written to the activity log (too frequent to be useful there).
export async function POST(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "like-post", { limit: 120, windowMs: 60_000 });
    const me = await getSessionUser();
    if (!me) throw new AppError("SIGN_IN_REQUIRED", 401, "Please sign in to like posts.");
    return NextResponse.json(await toggleLike(me, (await params).id));
  } catch (err) {
    return errorResponse(err, "POST /api/posts/[id]/like");
  }
}
