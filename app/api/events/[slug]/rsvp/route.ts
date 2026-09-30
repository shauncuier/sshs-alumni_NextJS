import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { AppError } from "@/lib/app-error";
import { AVATAR_LIMITS } from "@/lib/media/avatars";
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
    let body: { account?: never; rsvp?: never };
    let photo: Buffer | undefined;
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      // Joining: JSON details in `payload`, the profile photo in `photo`.
      const form = await req.formData();
      try {
        body = JSON.parse(String(form.get("payload") ?? ""));
      } catch {
        throw new AppError("INVALID_REQUEST", 400, "Invalid request.");
      }
      const file = form.get("photo");
      if (file instanceof File && file.size > 0) {
        if (file.size > AVATAR_LIMITS.maxBytes) throw new AppError("INVALID_PHOTO", 400, "The photo must be 5 MB or smaller.");
        photo = Buffer.from(await file.arrayBuffer());
      }
    } else {
      body = await req.json();
    }
    const result = await registerForEvent({
      slug: (await params).slug,
      sessionUserId: me?.id ?? null,
      // Account details and the photo only count for signed-out visitors.
      account: me ? undefined : body.account,
      photo: me ? undefined : photo,
      rsvp: body.rsvp ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/events/[slug]/rsvp");
  }
}
