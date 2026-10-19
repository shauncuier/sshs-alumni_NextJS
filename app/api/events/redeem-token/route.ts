import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { isTokenKind, redeemToken, tokenCounts, tokenKind } from "@/lib/events/tokens";
import { getSessionUser, isGateRole } from "@/lib/session-user";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

// GET /api/events/redeem-token?eventId= — food counters: tokens served and printed, per meal.
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me || !isGateRole(me.role)) {
    return NextResponse.json({ error: "Only gate staff can serve food tokens." }, { status: 403 });
  }
  try {
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Choose the event." }, { status: 400 });
    return NextResponse.json(await tokenCounts(eventId));
  } catch (err) {
    return errorResponse(err, "GET /api/events/redeem-token");
  }
}

// POST /api/events/redeem-token — { code, eventId?, kind }: serve a scanned token once at this counter.
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !isGateRole(me.role)) {
    return NextResponse.json({ error: "Only gate staff can serve food tokens." }, { status: 403 });
  }
  try {
    requireSameOrigin(req);
    const { code, eventId, kind } = await readJsonBody(req);
    if (typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Scan a token first." }, { status: 400 });
    if (!isTokenKind(kind)) return NextResponse.json({ error: "Choose which counter you are running." }, { status: 400 });
    const result = await redeemToken(code, me.email, { eventId: typeof eventId === "string" && eventId ? eventId : null, kind });
    const counter = tokenKind(kind)?.en ?? kind;
    await logActivity(
      result.ok
        ? { category: "EVENT", action: "token.redeemed", summary: `${counter}: served ${result.name} (person ${result.person} of ${result.people})`, actor: me, metadata: { kind, person: result.person }, req }
        : { category: "EVENT", action: "token.refused", status: "FAILURE", summary: `${counter} token refused: ${result.message}`, actor: me, metadata: { kind, reason: result.reason }, req }
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/redeem-token");
  }
}
