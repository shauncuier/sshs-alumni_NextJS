import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { listPublicEvents } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ events: await listPublicEvents() });
  } catch (err) {
    return errorResponse(err, "GET /api/events");
  }
}
