import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
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
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/verify-ticket");
  }
}
