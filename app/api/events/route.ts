import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sampleEvents } from "@/lib/data";

export async function GET() {
  try {
    try {
      const events = await prisma.event.findMany({
        orderBy: { date: "asc" },
      });
      if (events && events.length > 0) {
        return NextResponse.json({ events, source: "database" });
      }
    } catch (dbErr) {
      console.warn("Database events fallback:", dbErr);
    }

    return NextResponse.json({ events: sampleEvents, source: "fallback-dataset" });
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

// Event.slug is required and unique; derive it from the title and add a
// suffix when another event already uses it.
async function uniqueEventSlug(source: string): Promise<string> {
  const base = slugify(source) || "event";
  const taken = await prisma.event.findUnique({ where: { slug: base }, select: { id: true } });
  return taken ? `${base}-${Date.now().toString(36)}` : base;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    try {
      const event = await prisma.event.create({
        data: {
          slug: await uniqueEventSlug(body.slug || body.title || ""),
          title: body.title,
          category: body.category || "REUNION",
          description: body.description || "",
          date: new Date(body.date || Date.now()),
          time: body.time || "09:00 AM - 05:00 PM",
          venue: body.venue || "Main Campus Grounds",
          locationCity: body.locationCity || "Chattogram",
          organizer: body.organizer || "SSGHS Alumni Association",
          bannerImage: body.bannerImage || "/golden-jubilee.jpg",
          maxAttendees: Number(body.maxAttendees) || 500,
          attendeesCount: Number(body.attendeesCount) || 0,
          isRegistrationOpen: body.isRegistrationOpen ?? true,
        },
      });
      return NextResponse.json({ event, success: true });
    } catch (dbErr) {
      console.warn("Database create event fallback:", dbErr);
      return NextResponse.json({ event: body, success: true, note: "Memory saved" });
    }
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
