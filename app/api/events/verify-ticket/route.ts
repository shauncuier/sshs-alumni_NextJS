import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { checkInTicket } from "@/lib/events/tickets";
import { getSessionUser } from "@/lib/session-user";

const GATE_ROLES = ["ADMIN", "SUPER_ADMIN", "MODERATOR"];

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me || !GATE_ROLES.includes(me.role)) {
    return NextResponse.json({ error: "Only gate staff can check tickets in." }, { status: 403 });
  }
  try {
    const { code } = await req.json();
    if (typeof code !== "string" || !code.trim()) return NextResponse.json({ error: "Scan a ticket first." }, { status: 400 });
    const result = await checkInTicket(code, me.email);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/verify-ticket");
  }
}
