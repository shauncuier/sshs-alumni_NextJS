import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { DonationCampaignItem } from "@/lib/data";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { createManualDonation } from "@/lib/donations";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

const CATEGORY_LABELS: Record<string, DonationCampaignItem["category"]> = {
  SCHOLARSHIP: "Scholarship",
  STEM_LAB: "STEM Lab",
  LIBRARY: "Library",
  EMERGENCY_AID: "Emergency Aid",
  CAMPUS_DEV: "Campus Development",
};

// GET /api/donations — active fundraising campaigns from the database.
export async function GET() {
  try {
    const rows = await prisma.donationCampaign.findMany({
      where: { isActive: true },
      orderBy: { startDate: "asc" },
    });
    const now = Date.now();
    const campaigns: DonationCampaignItem[] = rows.map((c) => ({
      id: c.id,
      title: c.title,
      category: CATEGORY_LABELS[c.category] ?? "Scholarship",
      description: c.description,
      goalAmount: c.goalAmount,
      raisedAmount: c.raisedAmount,
      donorCount: c.donorCount,
      bannerImage: c.bannerImage ?? "",
      daysLeft: c.endDate ? Math.max(0, Math.ceil((c.endDate.getTime() - now) / 86_400_000)) : 0,
      featured: false,
    }));
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Donations GET error:", error);
    return NextResponse.json({ error: "Fundraising campaigns are unavailable right now." }, { status: 503 });
  }
}

// POST /api/donations — record a donation paid manually (bKash, Nagad, Bangla QR,
// bank, cash). It stays PENDING until the committee verifies the transaction ID.
export async function POST(req: Request) {
  const me = await getSessionUser();
  try {
    requireSameOrigin(req);
    requireRateLimit(req, "donation-submit", { limit: 10, windowMs: 60 * 60_000 });
    const donation = await createManualDonation(await readJsonBody(req), me?.id ?? null);
    await logActivity({
      category: "PAYMENT",
      action: "donation.submitted",
      summary: `${donation.isAnonymous ? "Anonymous donor" : donation.donorName} submitted ৳${donation.amount} by ${donation.paymentMethod} for "${donation.campaign.title}" (awaiting verification)`,
      actor: me ?? { email: donation.donorEmail },
      targetType: "Donation",
      targetId: donation.id,
      metadata: { amount: donation.amount, method: donation.paymentMethod, transactionRef: donation.transactionRef, receiptId: donation.receiptId, campaign: donation.campaign.title },
      req,
    });
    return NextResponse.json(
      {
        donation: {
          id: donation.id,
          receiptId: donation.receiptId,
          amount: donation.amount,
          paymentMethod: donation.paymentMethod,
          transactionRef: donation.transactionRef,
          status: donation.paymentStatus,
          campaignTitle: donation.campaign.title,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    await logFailure(err, { category: "PAYMENT", action: "donation.refused", actor: me, req });
    return errorResponse(err, "POST /api/donations");
  }
}
