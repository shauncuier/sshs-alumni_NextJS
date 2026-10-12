import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createEvent, listPublicEvents } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { readJsonBody, LARGE_JSON_BYTES, requireSameOrigin } from "@/lib/request-security";

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
    requireSameOrigin(req);
    const event = await createEvent(await readJsonBody(req, LARGE_JSON_BYTES));
    await logActivity({ category: "EVENT", action: "event.created", summary: `Created event "${event.title}"`, actor: me, targetType: "Event", targetId: event.id, metadata: { slug: event.slug }, req });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/events");
  }
}
