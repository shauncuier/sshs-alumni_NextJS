import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ registration: null });
  try {
    return NextResponse.json({ registration: await getMemberRegistration((await params).slug, me.id) });
  } catch (err) {
    return errorResponse(err, "GET /api/events/[slug]/rsvp");
  }
}

export async function POST(req: Request, { params }: Params) {
  const me = await getSessionUser();
  try {
    const body = await req.json();
    const result = await registerForEvent({
      slug: (await params).slug,
      sessionUserId: me?.id ?? null,
      // Account details only count for signed-out visitors.
      account: me ? undefined : body.account,
      rsvp: body.rsvp ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/[slug]/rsvp");
  }
}
