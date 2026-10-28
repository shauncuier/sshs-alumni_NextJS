import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { getAdminEvent } from "@/lib/events/admin";
import { deleteEvent, updateEvent } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { readJsonBody, LARGE_JSON_BYTES, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });

export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json(await getAdminEvent((await params).id));
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events/[id]");
  }
}

export async function PUT(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    requireSameOrigin(req);
    const body = await readJsonBody(req, LARGE_JSON_BYTES);
    const event = await updateEvent((await params).id, body);
    await logActivity({ category: "EVENT", action: "event.updated", summary: `Updated event "${event.title}"`, actor: me, targetType: "Event", targetId: event.id, metadata: { fields: Object.keys(body) }, req });
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/events/[id]");
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    requireSameOrigin(req);
    const { id } = await params;
    await deleteEvent(id);
    await logActivity({ category: "EVENT", action: "event.deleted", summary: `Deleted event ${id}`, actor: me, targetType: "Event", targetId: id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/events/[id]");
  }
}
