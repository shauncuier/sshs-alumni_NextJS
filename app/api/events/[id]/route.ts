import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only administrators may change events.
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();

    try {
      const updated = await prisma.event.update({
        where: { id },
        data: {
          title: body.title,
          category: body.category,
          description: body.description,
          date: body.date ? new Date(body.date) : undefined,
          time: body.time,
          venue: body.venue,
          locationCity: body.locationCity,
          organizer: body.organizer,
          bannerImage: body.bannerImage,
          maxAttendees: body.maxAttendees ? Number(body.maxAttendees) : undefined,
          attendeesCount: body.attendeesCount !== undefined ? Number(body.attendeesCount) : undefined,
          isRegistrationOpen: body.isRegistrationOpen,
        },
      });
      return NextResponse.json({ event: updated, success: true });
    } catch (dbErr) {
      console.error("Event update failed:", dbErr);
      return NextResponse.json({ error: "Could not update the event." }, { status: 503 });
    }
  } catch (error) {
    console.error("Event update error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only administrators may change events.
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Only administrators can manage events." }, { status: 403 });
    }
    const { id } = await params;

    try {
      await prisma.event.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, id });
    } catch (dbErr) {
      console.error("Event delete failed:", dbErr);
      return NextResponse.json({ error: "Could not delete the event." }, { status: 503 });
    }
  } catch (error) {
    console.error("Event delete error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
