import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createMagazineSubmission } from "@/lib/magazine";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// POST /api/magazine — a writing for the souvenir book from the public /magazine
// form (no sign-in). Stored for the committee, who copy it from /admin/feed.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "magazine", { limit: 5, windowMs: 60 * 60_000 });
    const body = await readJsonBody(req);
    // "website" is a hidden field people never see; only bots fill it in. Pretend it worked.
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ received: true }, { status: 201 });
    const row = await createMagazineSubmission(body);
    await logActivity({
      category: "CONTENT",
      action: "magazine.submitted",
      summary: `${row.name}${row.batch ? ` (SSC ${row.batch})` : ""} sent a writing for the souvenir book${row.title ? `: ${row.title.slice(0, 80)}` : ""}`,
      actor: row.email ? { email: row.email } : undefined,
      targetType: "MagazineSubmission",
      targetId: row.id,
      metadata: { name: row.name, batch: row.batch, phone: row.phone, email: row.email, title: row.title, length: row.content.length },
      req,
    });
    return NextResponse.json({ received: true, id: row.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/magazine");
  }
}
