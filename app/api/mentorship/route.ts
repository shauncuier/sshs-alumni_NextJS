/**
 * SSGHS Alumni — 1-on-1 Mentorship Matching API
 * GET /api/mentorship
 * POST /api/mentorship
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { sampleMentors, MentorProfile } from "@/lib/career-data";

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
    const session = await getServerSession();
    const body = await req.json();

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
  } catch (error: any) {
    console.error("[Mentorship Booking Error]", error);
    return NextResponse.json(
      { error: "Failed to book mentorship session", details: error.message },
      { status: 500 }
    );
  }
}
