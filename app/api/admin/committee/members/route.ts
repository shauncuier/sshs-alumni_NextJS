import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createMember } from "@/lib/committee";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

// POST /api/admin/committee/members — add a member to a term ({ termId, name, post, ... }).
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireArea("committee", "You cannot manage the committee.");
    const member = await createMember(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "committee.member_added",
      summary: `Added ${member.name} (${member.post}) to the committee`,
      actor: me,
      targetType: "CommitteeMember",
      targetId: member.id,
      metadata: { termId: member.termId },
      req,
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/committee/members");
  }
}
