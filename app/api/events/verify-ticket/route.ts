import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { checkInCounts, checkInTicket } from "@/lib/events/tickets";
import prisma from "@/lib/prisma";
import { getSessionUser, isGateRole } from "@/lib/session-user";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

// GET /api/events/verify-ticket[?eventId=] — gate staff: the events to check in for,
// and with eventId the check-in progress for that event.
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me || !isGateRole(me.role)) {
    return NextResponse.json({ error: "Only gate staff can check tickets in." }, { status: 403 });
  }
  try {
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (eventId) return NextResponse.json(await checkInCounts(eventId));
    const since = new Date(Date.now() - 2 * 86_400_000);
    const events = await prisma.event.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true },
      take: 20,
    });
    return NextResponse.json({ events: events.map((e) => ({ id: e.id, title: e.title, date: e.date.toISOString().slice(0, 10) })) });
  } catch (err) {
    return errorResponse(err, "GET /api/events/verify-ticket");
  }
}

// POST /api/events/verify-ticket — { code, eventId? }: check a scanned ticket in.
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !isGateRole(me.role)) {
    return NextResponse.json({ error: "Only gate staff can check tickets in." }, { status: 403 });
  }
  try {
    requireSameOrigin(req);
    const { code, eventId } = await readJsonBody(req);
    if (typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Scan a ticket first." }, { status: 400 });
    const result = await checkInTicket(code, me.email, new Date(), typeof eventId === "string" && eventId ? eventId : null);
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
