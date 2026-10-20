import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { AppError } from "@/lib/app-error";
import { requireArea } from "@/lib/admin/require-admin";
import { enterOfflineRegistration, type OfflineEntryInput } from "@/lib/events/offline-entry";
import { AVATAR_LIMITS } from "@/lib/media/avatars";
import { readLimitedFormData, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };
type Payload = Omit<OfflineEntryInput, "eventId" | "staff" | "photo" | "now">;

const MAX_BODY_BYTES = AVATAR_LIMITS.maxBytes + 64 * 1024;
const invalidRequest = () => new AppError("INVALID_REQUEST", 400, "Invalid request.");

/**
 * A committee member types in a paper registration form: JSON details in
 * `payload`, an optional photo in `photo`. The member is approved and the
 * registration confirmed at once (see lib/events/offline-entry.ts).
 */
export async function POST(req: Request, { params }: Params) {
  let me: Awaited<ReturnType<typeof requireArea>> | null = null;
  try {
    me = await requireArea("events", "Only the committee can enter paper forms.");
    requireSameOrigin(req);
    const form = await readLimitedFormData(req, MAX_BODY_BYTES);
    let payload: Payload;
    try {
      payload = JSON.parse(String(form.get("payload") ?? ""));
    } catch {
      throw invalidRequest();
    }
    if (!payload || typeof payload !== "object" || !payload.member) throw invalidRequest();
    let photo: Buffer | undefined;
    const file = form.get("photo");
    if (file instanceof File && file.size > 0) {
      if (file.size > AVATAR_LIMITS.maxBytes) throw new AppError("INVALID_PHOTO", 400, "The photo must be 5 MB or smaller.");
      photo = Buffer.from(await file.arrayBuffer());
    }

    const { id } = await params;
    const result = await enterOfflineRegistration({ ...payload, eventId: id, staff: { id: me.id, email: me.email }, photo });
    await logActivity({
      category: "EVENT",
      action: "registration.offline_entered",
      summary: `${me.email} entered a paper form for ${payload.member.fullName} (SSC ${payload.member.sscBatch}), ${payload.paymentMethod} ৳${result.totalFee}`,
      actor: me,
      targetType: "EventRegistration",
      targetId: result.registrationId,
      metadata: { eventId: id, formNo: payload.formNo ?? null, receiptNo: payload.receiptNo ?? null, paymentMethod: payload.paymentMethod, totalFee: result.totalFee },
      req,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await logFailure(err, { category: "EVENT", action: "registration.offline_refused", actor: me, req });
    return errorResponse(err, "POST /api/admin/events/[id]/offline-entry");
  }
}
