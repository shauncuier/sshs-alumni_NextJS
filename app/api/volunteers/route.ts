import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { requireRateLimit } from "@/lib/request-security";
import { AppError } from "@/lib/app-error";
import {
  createVolunteer,
  getVolunteers,
  SUBCOMMITTEES,
  updateVolunteerStatus,
} from "@/lib/volunteers";

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
  try {
    requireRateLimit(req, "volunteer-application", { limit: 3, windowMs: 60 * 60_000 });
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      sscBatch,
      subcommittee,
      skills,
      availability,
      experience,
      notes,
      source,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    const batchNum = Number(sscBatch);
    if (!batchNum || batchNum < 1960 || batchNum > 2035) {
      return NextResponse.json({ error: "Valid SSC batch year is required" }, { status: 400 });
    }
    if (!subcommittee || !subcommittee.trim()) {
      return NextResponse.json({ error: "Please select a subcommittee" }, { status: 400 });
    }

    const created = await createVolunteer({
      fullName,
      email,
      phone,
      sscBatch: batchNum,
      subcommittee,
      skills,
      availability,
      experience,
      notes,
      source: source === "EVENT_REGISTRATION" ? "EVENT_REGISTRATION" : "PUBLIC_APPLICATION",
    });

    return NextResponse.json({ success: true, volunteer: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[Volunteers API POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit volunteer application" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, subcommittee } = body;

    if (!id) {
      return NextResponse.json({ error: "Volunteer ID is required" }, { status: 400 });
    }
    if (!status || !["APPROVED", "DECLINED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    const updated = await updateVolunteerStatus(id, status, subcommittee);
    if (!updated) {
      return NextResponse.json({ error: "Volunteer record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, volunteer: updated });
  } catch (error) {
    console.error("[Volunteers API PATCH Error]:", error);
    return NextResponse.json({ error: "Failed to update volunteer status" }, { status: 500 });
  }
}
