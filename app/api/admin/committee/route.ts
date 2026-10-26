import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createTerm, getPresidentMessage, listAllTerms } from "@/lib/committee";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("committee", "You cannot manage the committee.");

// GET /api/admin/committee — every term with its members, and the President's message.
export async function GET() {
  try {
    await requireAdmin();
    const [terms, presidentMessage] = await Promise.all([listAllTerms(), getPresidentMessage()]);
    return NextResponse.json({ terms, presidentMessage });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/committee");
  }
}

// POST /api/admin/committee — add a committee term.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const term = await createTerm(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "committee.term_created",
      summary: `Added committee term "${term.title}"${term.isCurrent ? " (current)" : ""}`,
      actor: me,
      targetType: "CommitteeTerm",
      targetId: term.id,
      req,
    });
    return NextResponse.json({ term }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/committee");
  }
}
