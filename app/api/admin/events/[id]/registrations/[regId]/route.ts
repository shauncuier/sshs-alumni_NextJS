import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { decideRegistration } from "@/lib/events/admin";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { readJsonBody } from "@/lib/request-security";

const ACTIONS = ["APPROVE", "CANCEL", "CHECK_IN", "UNDO_CHECK_IN"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; regId: string }> }) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Only administrators can manage registrations." }, { status: 403 });
  }
  try {
    const { action } = await readJsonBody(req);
    if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const { id, regId } = await params;
    return NextResponse.json({ registration: await decideRegistration({ eventId: id, registrationId: regId, action, adminEmail: me.email }) });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/events/[id]/registrations/[regId]");
  }
}
