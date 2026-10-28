import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createSponsor, listSponsors } from "@/lib/sponsors";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("committee", "You cannot manage the sponsors.");

// GET /api/admin/sponsors — every sponsor, published or not, in display order.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ sponsors: await listSponsors() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/sponsors");
  }
}

// POST /api/admin/sponsors — add a sponsor.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const sponsor = await createSponsor(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "sponsor.added",
      summary: `Added sponsor ${sponsor.name}`,
      actor: me,
      targetType: "Sponsor",
      targetId: sponsor.id,
      req,
    });
    return NextResponse.json({ sponsor }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/sponsors");
  }
}
