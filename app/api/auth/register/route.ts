import { NextResponse } from "next/server";

// Joining the association is the paid Golden Jubilee registration
// (POST /api/events/[slug]/rsvp), so no free account can be created here.
export async function POST() {
  return NextResponse.json(
    { error: "Join the association through the Golden Jubilee registration.", code: "JOIN_THROUGH_JUBILEE" },
    { status: 410 }
  );
}
