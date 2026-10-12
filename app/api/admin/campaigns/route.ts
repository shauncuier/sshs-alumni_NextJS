import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { CAMPAIGN_CATEGORIES, CATEGORY_LABELS, createCampaign, listAdminCampaigns } from "@/lib/campaigns";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("donations", "Only administrators can manage fundraising campaigns.");

// GET /api/admin/campaigns — every campaign, newest first, with its status and donation count.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      campaigns: await listAdminCampaigns(),
      categories: CAMPAIGN_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/campaigns");
  }
}

// POST /api/admin/campaigns — open a new fundraising campaign.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const campaign = await createCampaign(await readJsonBody(req));
    await logActivity({
      category: "ADMIN",
      action: "campaign.created",
      summary: `Created fundraising campaign "${campaign.title}" (goal ৳${campaign.goalAmount.toLocaleString("en-US")})`,
      actor: me,
      targetType: "DonationCampaign",
      targetId: campaign.id,
      metadata: { category: campaign.category, goalAmount: campaign.goalAmount, startDate: campaign.startDate, endDate: campaign.endDate, isActive: campaign.isActive },
      req,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/campaigns");
  }
}
