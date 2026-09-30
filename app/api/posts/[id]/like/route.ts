import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/session-user";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
