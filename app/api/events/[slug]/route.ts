import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getPublicEventBySlug } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const event = await getPublicEventBySlug((await params).slug);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err, "GET /api/events/[slug]");
  }
}
