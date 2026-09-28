import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { deleteEvent, updateEvent } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });

export async function PUT(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    return NextResponse.json({ event: await updateEvent((await params).id, await req.json()) });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/events/[id]");
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) return forbidden();
  try {
    await deleteEvent((await params).id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/events/[id]");
  }
}
