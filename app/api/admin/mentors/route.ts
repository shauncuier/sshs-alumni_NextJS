import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listMentorsForAdmin } from "@/lib/mentorship";

// GET /api/admin/mentors?status= — mentor profiles for review, pending first.
export async function GET(req: Request) {
  try {
    await requireAdmin("Only administrators can review mentors.");
    const rows = await listMentorsForAdmin(new URL(req.url).searchParams.get("status"));
    return NextResponse.json({
      mentors: rows.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        sscBatch: m.sscBatch,
        designation: m.designation,
        organization: m.organization,
        domain: m.domain,
        bio: m.bio,
        topicsOffered: m.topicsOffered,
        status: m.status,
        reviewedBy: m.reviewedBy,
        rejectReason: m.rejectReason,
        createdAt: m.createdAt.toISOString(),
        menteesHelped: m._count.requests,
      })),
    });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/mentors");
  }
}
