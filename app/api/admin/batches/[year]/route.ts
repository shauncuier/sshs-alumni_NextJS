import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { updateBatch } from "@/lib/batches";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

type Params = { params: Promise<{ year: string }> };

// PATCH /api/admin/batches/[year] — set the representative, contact, tagline, description and reunion date.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("batches", "Only administrators can manage batches.");
    const year = Number((await params).year);
    const body = await readJsonBody(req);
    const batch = await updateBatch(year, body);
    await logActivity({
      category: "ADMIN",
      action: "batch.updated",
      summary: `Updated SSC Batch ${year}${batch.classRepresentative ? ` (representative: ${batch.classRepresentative})` : ""}`,
      actor: me,
      targetType: "Batch",
      targetId: String(year),
      metadata: { fields: Object.keys(body) },
      req,
    });
    return NextResponse.json({ batch: { year: batch.year } });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/batches/[year]");
  }
}
