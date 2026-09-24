import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { id } = await params;

    const name = body.name || session?.user?.name || "Alumnus";
    const batch = body.batch || (session?.user as unknown as { batchYear?: number })?.batchYear || 2008;

    return NextResponse.json({
      message: "RSVP confirmed successfully",
      eventId: id,
      attendee: {
        name,
        batch,
        timestamp: new Date().toISOString(),
      },
      status: "CONFIRMED",
    });
  } catch (error) {
    console.error("RSVP API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
