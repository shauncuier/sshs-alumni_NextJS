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
