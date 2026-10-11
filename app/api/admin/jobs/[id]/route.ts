import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { deleteJob } from "@/lib/jobs";
import { requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/jobs/[id] — remove a job and its applications (e.g. spam).
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("jobs", "You cannot delete jobs.");
    const job = await deleteJob(me, (await params).id);
    await logActivity({ category: "ADMIN", action: "job.deleted", summary: `Deleted job "${job.title}" at ${job.company} posted by ${job.postedByEmail}`, actor: me, targetType: "Job", targetId: job.id, req });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/jobs/[id]");
  }
}
