import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { DonationCampaignItem } from "@/lib/data";

const CATEGORY_LABELS: Record<string, DonationCampaignItem["category"]> = {
  SCHOLARSHIP: "Scholarship",
  STEM_LAB: "STEM Lab",
  LIBRARY: "Library",
  EMERGENCY_AID: "Emergency Aid",
  CAMPUS_DEV: "Campus Development",
};

// GET /api/donations — active fundraising campaigns from the database. Donations
// are made through /api/payments/initiate, which needs these real campaign ids.
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
