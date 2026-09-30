import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { AppError } from "@/lib/app-error";
import type { AccountInput, RsvpInput } from "@/lib/events/types";
import { AVATAR_LIMITS } from "@/lib/media/avatars";
import { getSessionUser } from "@/lib/session-user";

type Params = { params: Promise<{ slug: string }> };

// The photo may be 5 MB; the rest of the multipart body (JSON details, boundaries) is small.
const MAX_BODY_BYTES = AVATAR_LIMITS.maxBytes + 64 * 1024;
const tooLarge = () => new AppError("INVALID_PHOTO", 400, "The photo must be 5 MB or smaller.");
const invalidRequest = () => new AppError("INVALID_REQUEST", 400, "Invalid request.");

function parsePayload(raw: unknown): { account?: AccountInput; rsvp?: RsvpInput } {
  try {
    const parsed = JSON.parse(String(raw ?? ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  throw invalidRequest();
}

/**
 * Reads a multipart body without ever holding more than the size cap: refuses on a
 * too-large Content-Length up front, and otherwise counts bytes while streaming
 * (Next.js sets no body limit on route handlers, so this must be done here).
 */
async function readLimitedForm(req: Request): Promise<FormData> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw tooLarge();
  if (!req.body) throw invalidRequest();
  let seen = 0;
  const limited = req.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > MAX_BODY_BYTES) controller.error(tooLarge());
        else controller.enqueue(chunk);
      },
    })
  );
  try {
    return await new Response(limited, { headers: req.headers }).formData();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw invalidRequest();
  }
}

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
    let body: { account?: AccountInput; rsvp?: RsvpInput };
    let photo: Buffer | undefined;
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      // Joining: JSON details in `payload`, the profile photo in `photo`.
      const form = await readLimitedForm(req);
      body = parsePayload(form.get("payload"));
      const file = form.get("photo");
      if (file instanceof File && file.size > 0) {
        if (file.size > AVATAR_LIMITS.maxBytes) throw tooLarge();
        photo = Buffer.from(await file.arrayBuffer());
      }
    } else {
      body = parsePayload(await req.text().catch(() => ""));
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
