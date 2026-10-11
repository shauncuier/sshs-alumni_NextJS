import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { listApprovedMentors } from "@/lib/mentorship";

// GET /api/mentorship — approved mentors. Requests go to /api/mentorship/requests.
export async function GET() {
  try {
    const mentors = await listApprovedMentors();
    return NextResponse.json({ total: mentors.length, mentors });
  } catch (err) {
    return errorResponse(err, "GET /api/mentorship");
  }
}
