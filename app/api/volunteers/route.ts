import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import prisma from "@/lib/prisma";
import { requireRateLimit, readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import {
  createVolunteer,
  getVolunteers,
  SUBCOMMITTEES,
  updateVolunteerStatus,
  VOLUNTEER_STATUSES,
  type VolunteerStatus,
} from "@/lib/volunteers";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const optional = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined);

export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || "ALL";
    const items = await getVolunteers(statusParam);
    return NextResponse.json({
      volunteers: items,
      total: items.length,
      subcommittees: SUBCOMMITTEES,
    });
  } catch (error) {
    console.error("[Volunteers API GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch volunteers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "volunteer-application", { limit: 3, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    // A signed-in member's own details fill whatever the form left out.
    const profile = me ? await prisma.alumniProfile.findUnique({ where: { userId: me.id }, select: { fullName: true, phone: true, sscBatch: true } }) : null;
    const fullName = text(body.fullName) || profile?.fullName || "";
    const email = text(body.email) || (me?.email ?? "");
    const phone = text(body.phone) || profile?.phone || "";
    const batchNum = Number(body.sscBatch) || profile?.sscBatch || NaN;

    if (!fullName) throw new AppError("INVALID_VOLUNTEER", 400, "Full name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError("INVALID_VOLUNTEER", 400, "Valid email is required");
    if (!phone && !me) throw new AppError("INVALID_VOLUNTEER", 400, "Phone number is required");
    if (!Number.isInteger(batchNum) || batchNum < 1960 || batchNum > new Date().getFullYear()) {
      throw new AppError("INVALID_VOLUNTEER", 400, "Valid SSC batch year is required");
    }

    const created = await createVolunteer({
      fullName,
      email,
      phone,
      sscBatch: batchNum,
      subcommittee: text(body.subcommittee),
      skills: optional(body.skills),
      availability: optional(body.availability),
      experience: optional(body.experience),
      notes: optional(body.notes),
      source: body.source === "EVENT_REGISTRATION" ? "EVENT_REGISTRATION" : "PUBLIC_APPLICATION",
      userId: me?.id ?? null,
    });

    await logActivity({ category: "CONTENT", action: "volunteer.applied", summary: `${created.fullName} applied to volunteer (${created.subcommitteeLabel})`, actor: me ?? { email: created.email }, targetType: "Volunteer", targetId: created.id, metadata: { batch: created.sscBatch, subcommittee: created.subcommittee, source: created.source }, req });
    return NextResponse.json({ success: true, volunteer: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[Volunteers API POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit volunteer application" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Unauthorized access");

    const body = await readJsonBody(req);
    const id = text(body.id);
    const status = body.status as VolunteerStatus;
    if (!id) throw new AppError("INVALID_REQUEST", 400, "Volunteer ID is required");
    if (!(VOLUNTEER_STATUSES as readonly string[]).includes(status)) throw new AppError("INVALID_REQUEST", 400, "Valid status is required");

    const updated = await updateVolunteerStatus(id, status, optional(body.subcommittee), me.email);
    if (!updated) throw new AppError("NOT_FOUND", 404, "Volunteer record not found");

    await logActivity({ category: "ADMIN", action: `volunteer.${status.toLowerCase()}`, summary: `Set volunteer ${updated.fullName} to ${status}`, actor: me, targetType: "Volunteer", targetId: id, metadata: { subcommittee: updated.subcommittee }, req });
    return NextResponse.json({ success: true, volunteer: updated });
  } catch (error) {
    await logFailure(error, { category: "ADMIN", action: "volunteer.change_refused", actor: me, req });
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[Volunteers API PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update volunteer status" }, { status: 500 });
  }
}
