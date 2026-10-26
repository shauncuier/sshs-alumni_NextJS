import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createConstitution, listConstitutions } from "@/lib/constitution";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("committee", "You cannot manage the constitution.");

// GET /api/admin/constitution — every version, newest first.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ documents: await listConstitutions() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/constitution");
  }
}

// POST /api/admin/constitution — add a version ({ title, year, summary, fileUrl } with an uploaded PDF).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const document = await createConstitution(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "constitution.added",
      summary: `Added constitution "${document.title}" (${document.year})`,
      actor: me,
      targetType: "ConstitutionDocument",
      targetId: document.id,
      req,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/constitution");
  }
}
