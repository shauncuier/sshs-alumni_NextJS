import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requireArea } from "@/lib/admin/require-admin";
import { listJobsForAdmin } from "@/lib/jobs";

// GET /api/admin/jobs?status= — every job for review, pending first.
export async function GET(req: Request) {
  try {
    await requireArea("jobs", "You cannot review jobs.");
    const rows = await listJobsForAdmin(new URL(req.url).searchParams.get("status"));
    return NextResponse.json({
      jobs: rows.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        jobType: j.jobType,
        workplaceType: j.workplaceType,
        description: j.description,
        deadline: j.deadline.toISOString(),
        status: j.status,
        postedByName: j.postedByName,
        postedByEmail: j.postedByEmail,
        postedByBatch: j.postedByBatch,
        reviewedBy: j.reviewedBy,
        rejectReason: j.rejectReason,
        createdAt: j.createdAt.toISOString(),
        applications: j._count.applications,
      })),
    });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/jobs");
  }
}
