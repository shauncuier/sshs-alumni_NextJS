import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { listMemberRegistrations } from "@/lib/events/registrations";
import { getSessionUser } from "@/lib/session-user";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ registrations: await listMemberRegistrations(me.id) });
  } catch (err) {
    return errorResponse(err, "GET /api/me/registrations");
  }
}
