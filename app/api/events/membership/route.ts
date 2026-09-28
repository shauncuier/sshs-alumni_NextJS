import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMembershipEvent } from "@/lib/events/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const event = await getMembershipEvent();
    if (!event) return NextResponse.json({ error: "Membership registration opens soon." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err, "GET /api/events/membership");
  }
}
