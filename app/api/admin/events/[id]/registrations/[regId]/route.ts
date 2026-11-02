import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { decideRegistration, toAdminRegistration, WITH_USER } from "@/lib/events/admin";
import { editRegistration } from "@/lib/events/edit-registration";
import { getPublicEventBySlug } from "@/lib/events/service";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const ACTIONS = ["APPROVE", "CANCEL", "CHECK_IN", "UNDO_CHECK_IN"] as const;

type Params = { params: Promise<{ id: string; regId: string }> };

/** Only the super admin corrects a registration's package, guests and fee. */
async function requireSuperAdmin() {
  const me = await getSessionUser();
  if (!me || me.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", 403, "Only the super admin can change a registration.");
  return me;
}

export async function PATCH(req: Request, { params }: Params) {
  const me = await getSessionUser();
  if (!me || !isAdminRole(me.role)) {
    return NextResponse.json({ error: "Only administrators can manage registrations." }, { status: 403 });
  }
  try {
    requireSameOrigin(req);
    const { action, merchantTrxId } = await readJsonBody(req);
    if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    const { id, regId } = await params;
    const registration = await decideRegistration({ eventId: id, registrationId: regId, action, adminEmail: me.email, merchantTrxId });
    await logActivity({
      category: "ADMIN",
      action: `registration.${String(action).toLowerCase()}`,
      summary: `${action} registration ${regId}`,
      actor: me,
      targetType: "EventRegistration",
      targetId: regId,
      metadata: { eventId: id, newStatus: (registration as { status?: string }).status, merchantTrxId: registration.merchantTrxId ?? undefined },
      req,
    });
    return NextResponse.json({ registration });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/events/[id]/registrations/[regId]");
  }
}

// GET — the registration and its event's prices, for the super admin's edit dialog.
export async function GET(_req: Request, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id, regId } = await params;
    const reg = await prisma.eventRegistration.findUnique({ where: { id: regId }, include: { ...WITH_USER, event: { select: { slug: true } } } });
    if (!reg || reg.eventId !== id) throw new AppError("REGISTRATION_NOT_FOUND", 404, "Registration not found.");
    const event = await getPublicEventBySlug(reg.event.slug);
    if (!event) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found.");
    return NextResponse.json({ registration: toAdminRegistration(reg), event });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/events/[id]/registrations/[regId]");
  }
}

// PUT { packageName, guests, guestPeople, amountOverride, note } — correct the package, guests and fee.
export async function PUT(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireSuperAdmin();
    const body = (await readJsonBody(req)) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new AppError("INVALID_INPUT", 400, "Invalid request.");
    const guests = body.guests && typeof body.guests === "object" ? (body.guests as Record<string, number>) : {};
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
    const { id, regId } = await params;
    const result = await editRegistration({
      eventId: id,
      registrationId: regId,
      adminEmail: me.email,
      packageName: typeof body.packageName === "string" ? body.packageName : null,
      guests,
      guestPeople: body.guestPeople,
      amountOverride: body.amountOverride,
    });
    await logActivity({
      category: "ADMIN",
      action: "registration.edited",
      summary: `Corrected registration of ${result.registration.name}: ${result.before.headCount} → ${result.after.headCount} people, ৳${result.before.totalFee} → ৳${result.after.totalFee}`,
      actor: me,
      targetType: "EventRegistration",
      targetId: regId,
      metadata: { eventId: id, before: result.before, after: result.after, note: note || undefined },
      req,
    });
    return NextResponse.json({ registration: result.registration });
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/events/[id]/registrations/[regId]");
  }
}
