import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createVolunteer,
  getVolunteers,
  SUBCOMMITTEES,
  updateVolunteerStatus,
} from "@/lib/volunteers";

export async function GET(req: Request) {
  try {
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
    console.error("[Volunteers API POST Error]:", error);
    return NextResponse.json({ error: "Failed to submit volunteer application" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as unknown as { role?: string })?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
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
