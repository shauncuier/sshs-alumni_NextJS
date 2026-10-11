import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { checkInTicket } from "@/lib/events/tickets";
import { getSessionUser, isGateRole } from "@/lib/session-user";
import { readJsonBody } from "@/lib/request-security";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !isGateRole(me.role)) {
    return NextResponse.json({ error: "Only gate staff can check tickets in." }, { status: 403 });
  }
  try {
    const { code } = await readJsonBody(req);
    if (typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Scan a ticket first." }, { status: 400 });
    const result = await checkInTicket(code, me.email);
    await logActivity(
      result.ok
        ? { category: "EVENT", action: "ticket.checked_in", summary: `Checked in ${result.attendee.name} (${result.headCount} people) at ${result.eventTitle}`, actor: me, metadata: { event: result.eventTitle, headCount: result.headCount, package: result.packageName }, req }
        : { category: "EVENT", action: "ticket.check_in_refused", status: "FAILURE", summary: `Ticket refused at the gate: ${result.message}`, actor: me, metadata: { reason: result.reason }, req }
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/verify-ticket");
  }
}
