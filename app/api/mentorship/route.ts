/**
 * SSGHS Alumni — 1-on-1 Mentorship Matching API
 * GET /api/mentorship
 * POST /api/mentorship
 */

import { NextRequest, NextResponse } from "next/server";
import { sampleMentors, MentorProfile } from "@/lib/career-data";
import { AppError } from "@/lib/app-error";
import { requireRateLimit, readJsonBody } from "@/lib/request-security";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");

  let filtered = [...sampleMentors];
  if (domain && domain !== "ALL") {
    filtered = filtered.filter((m) => m.domain.toLowerCase() === domain.toLowerCase());
  }

  return NextResponse.json({
    total: filtered.length,
    mentors: filtered,
  });
}

export async function POST(req: NextRequest) {
  try {
    requireRateLimit(req, "mentorship", { limit: 5, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);

    const {
      mentorId,
      mentorName,
      menteeName,
      menteeEmail,
      menteeBatch,
      menteePhone,
      selectedTopic,
      preferredDate,
      questionsForMentor,
    } = body;

    if (!mentorId || !menteeName || !menteeEmail) {
      return NextResponse.json(
        { error: "Mentor ID, mentee name, and email are required" },
        { status: 400 }
      );
    }

    const mentorshipBooking = {
      bookingId: `MENTOR-${Date.now().toString().slice(-6)}`,
      mentorId,
      mentorName,
      menteeName,
      menteeEmail,
      menteeBatch: menteeBatch || 2018,
      menteePhone,
      selectedTopic: selectedTopic || "General Career Guidance",
      preferredDate: preferredDate || "Upcoming Weekend",
      questionsForMentor,
      meetingLink: `https://meet.google.com/ssh-alumni-${Date.now().toString().slice(-4)}`,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    console.log(`[Mentorship] Booked session with ${mentorName} for mentee ${menteeName}`);

    return NextResponse.json({
      success: true,
      message: "Mentorship session confirmed. Google Meet calendar link generated.",
      booking: mentorshipBooking,
    });
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    console.error("[Mentorship Booking Error]", error);
    return NextResponse.json(
      { error: "Failed to book mentorship session" },
      { status: 500 }
    );
  }
}
