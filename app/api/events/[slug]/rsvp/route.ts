import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { getMemberRegistration, registerForEvent } from "@/lib/events/registrations";
import { AppError } from "@/lib/app-error";
import type { AccountInput, RsvpInput } from "@/lib/events/types";
import { AVATAR_LIMITS } from "@/lib/media/avatars";
import { PROOF_LIMITS } from "@/lib/media/proofs";
import { RECEIPT_MAX_BYTES } from "@/lib/media/receipts";
import { getSessionUser } from "@/lib/session-user";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ slug: string }> };
type Payload = { account?: AccountInput; rsvp?: RsvpInput; proof?: { type?: unknown; note?: unknown } | null };

// The photo may be 5 MB, the proof document and the payment screenshot 10 MB each;
// the rest of the multipart body (JSON details, boundaries) is small.
const MAX_BODY_BYTES = AVATAR_LIMITS.maxBytes + PROOF_LIMITS.maxBytes + RECEIPT_MAX_BYTES + 64 * 1024;
const tooLarge = () =>
  new AppError("UPLOAD_TOO_LARGE", 400, "The upload is too large. The photo must be 5 MB or smaller, the proof document and the payment screenshot 10 MB or smaller each.");
const photoTooLarge = () => new AppError("INVALID_PHOTO", 400, "The photo must be 5 MB or smaller.");
const proofTooLarge = () => new AppError("INVALID_PROOF", 400, "The proof document must be 10 MB or smaller.");
const receiptTooLarge = () => new AppError("INVALID_RECEIPT", 400, "The payment screenshot must be 10 MB or smaller.");
const invalidRequest = () => new AppError("INVALID_REQUEST", 400, "Invalid request.");

function parsePayload(raw: unknown): Payload {
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
    requireSameOrigin(req);
    // Per internet address. Mobile operators put many people behind one address, so
    // this only stops floods; one SMS-verified number per account stops mass sign-ups.
    requireRateLimit(req, me ? "event-rsvp-member" : "event-rsvp-public", { limit: 30, windowMs: 60 * 60_000 });
    let body: Payload;
    let photo: Buffer | undefined;
    let proofFile: Buffer | undefined;
    let paymentScreenshot: Buffer | undefined;
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      // Joining: JSON details in `payload`, the profile photo in `photo` and the
      // proof-of-study document in `proof`.
      const form = await readLimitedForm(req);
      body = parsePayload(form.get("payload"));
      const file = form.get("photo");
      if (file instanceof File && file.size > 0) {
        if (file.size > AVATAR_LIMITS.maxBytes) throw photoTooLarge();
        photo = Buffer.from(await file.arrayBuffer());
      }
      const proof = form.get("proof");
      if (proof instanceof File && proof.size > 0) {
        if (proof.size > PROOF_LIMITS.maxBytes) throw proofTooLarge();
        proofFile = Buffer.from(await proof.arrayBuffer());
      }
      // The payment screenshot; registerForEvent saves it and refuses a paid
      // registration without one (Cash excepted).
      const receipt = form.get("paymentReceipt");
      if (receipt instanceof File && receipt.size > 0) {
        if (receipt.size > RECEIPT_MAX_BYTES) throw receiptTooLarge();
        paymentScreenshot = Buffer.from(await receipt.arrayBuffer());
      }
    } else {
      body = (await readJsonBody(req)) as Payload;
    }
    const slug = (await params).slug;
    const result = await registerForEvent({
      slug,
      sessionUserId: me?.id ?? null,
      // Account details, the photo and the proof only count for signed-out visitors.
      account: me ? undefined : body.account,
      photo: me ? undefined : photo,
      proof: me ? undefined : { type: body.proof?.type, note: body.proof?.note, file: proofFile },
      rsvp: body.rsvp ?? {},
      paymentScreenshot,
    });
    const reg = result.registration;
    await logActivity({
      category: "EVENT",
      action: result.createdAccount ? "member.joined" : "event.registered",
      summary: result.createdAccount
        ? `${result.createdAccount.email} applied to join (${reg.eventTitle}), payment ${reg.paymentMethod ?? "none"}`
        : `${me?.email ?? "Member"} registered for ${reg.eventTitle}`,
      actor: me ?? { email: result.createdAccount?.email },
      targetType: "EventRegistration",
      targetId: reg.id,
      metadata: {
        event: reg.eventSlug,
        status: reg.status,
        headCount: reg.headCount,
        totalFee: reg.totalFee,
        donation: reg.donationAmount,
        paymentMethod: reg.paymentMethod,
        transactionRef: reg.transactionId,
        contactVerifiedBy: body.account?.phoneVerificationToken ? "sms" : body.account?.emailVerificationToken ? "email" : null,
      },
      req,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await logFailure(err, { category: "EVENT", action: "event.register_refused", actor: me, req });
    return errorResponse(err, "POST /api/events/[slug]/rsvp");
  }
}
