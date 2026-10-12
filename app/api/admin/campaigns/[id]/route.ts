import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { deleteCampaign, updateCampaign } from "@/lib/campaigns";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

const requireAdmin = () => requireArea("donations", "Only administrators can manage fundraising campaigns.");

// PATCH /api/admin/campaigns/[id] — edit, close ({ isActive: false }) or reopen a campaign.
export async function PATCH(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = await readJsonBody(req);
    const { before, after } = await updateCampaign((await params).id, body);
    const action = before.isActive && !after.isActive ? "campaign.closed" : !before.isActive && after.isActive ? "campaign.reopened" : "campaign.updated";
    const verb = { "campaign.closed": "Closed", "campaign.reopened": "Reopened", "campaign.updated": "Updated" }[action];
    await logActivity({
      category: "ADMIN",
      action,
      summary: `${verb} fundraising campaign "${after.title}"`,
      actor: me,
      targetType: "DonationCampaign",
      targetId: after.id,
      metadata: { fields: Object.keys(body), goalAmount: after.goalAmount, endDate: after.endDate },
      req,
    });
    return NextResponse.json({ campaign: after });
  } catch (err) {
    return errorResponse(err, "PATCH /api/admin/campaigns/[id]");
  }
}

// DELETE /api/admin/campaigns/[id] — only a campaign nobody has donated to.
export async function DELETE(req: Request, { params }: Params) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const campaign = await deleteCampaign((await params).id);
    await logActivity({
      category: "ADMIN",
      action: "campaign.deleted",
      summary: `Deleted fundraising campaign "${campaign.title}"`,
      actor: me,
      targetType: "DonationCampaign",
      targetId: campaign.id,
      req,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, "DELETE /api/admin/campaigns/[id]");
  }
}
