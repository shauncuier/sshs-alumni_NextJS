import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { createEvent, listPublicEvents } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { readJsonBody } from "@/lib/request-security";

const forbidden = () => NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });

export async function GET() {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ events: await listPublicEvents() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events");
  }
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ event: await createEvent(await readJsonBody(req)) }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/events");
  }
}
