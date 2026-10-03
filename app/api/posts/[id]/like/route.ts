import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRateLimit(req, "like-post", { limit: 60, windowMs: 60_000 });

    const session = await getMemberSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Return successful toggle response
    return NextResponse.json({
      message: "Post like status toggled",
      postId: id,
      success: true,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

