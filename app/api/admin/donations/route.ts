import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const [campaigns, donations, completedAgg, pending] = await Promise.all([
      prisma.donationCampaign.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.donation.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          campaign: {
            select: { title: true },
          },
        },
      }),
      prisma.donation.aggregate({
        where: { paymentStatus: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Manual donations waiting for the committee to check the payment, oldest first.
      prisma.donation.findMany({
        where: { paymentGateway: "MANUAL", paymentStatus: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { campaign: { select: { title: true } } },
      }),
    ]);

    const now = Date.now();
    const formattedCampaigns = campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      description: c.description,
      goalAmount: c.goalAmount,
      raisedAmount: c.raisedAmount,
      donorCount: c.donorCount,
      bannerImage: c.bannerImage || "",
      isActive: c.isActive,
      daysLeft: c.endDate ? Math.max(0, Math.ceil((c.endDate.getTime() - now) / 86_400_000)) : 0,
      createdAt: c.createdAt.toISOString(),
    }));

    // Aggregate metrics
    const campaignTotalRaised = campaigns.reduce((acc, c) => acc + (c.raisedAmount || 0), 0);
    const directDonationRaised = completedAgg._sum.amount || 0;
    const totalRaised = Math.max(campaignTotalRaised, directDonationRaised);
    const totalGoal = campaigns.reduce((acc, c) => acc + (c.goalAmount || 0), 0);

    // Unique donors count
    const campaignDonorCount = campaigns.reduce((acc, c) => acc + (c.donorCount || 0), 0);
    const totalDonors = Math.max(campaignDonorCount, completedAgg._count.id || 0);

    const formattedDonations = donations.map((d) => ({
      id: d.id,
      donorName: d.isAnonymous ? "Anonymous Alumnus" : d.donorName,
      donorEmail: d.donorEmail,
      donorBatch: d.donorBatch,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      paymentStatus: d.paymentStatus,
      campaignTitle: d.campaign?.title || "General Fund",
      paidAt: d.paidAt ? d.paidAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      transactionRef: d.transactionRef || d.gatewayTrxId || null,
    }));

    const formattedPending = pending.map((d) => ({
      id: d.id,
      donorName: d.donorName,
      isAnonymous: d.isAnonymous,
      donorEmail: d.donorEmail,
      donorPhone: d.donorPhone,
      donorBatch: d.donorBatch,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      transactionRef: d.transactionRef,
      receiptId: d.receiptId,
      campaignTitle: d.campaign?.title || "General Fund",
      createdAt: d.createdAt.toISOString(),
    }));

    return NextResponse.json({
      pending: formattedPending,
      stats: {
        totalRaised,
        totalGoal,
        totalDonors,
        activeCampaignsCount: campaigns.filter((c) => c.isActive).length,
      },
      campaigns: formattedCampaigns,
      donations: formattedDonations,
    });
  } catch (error) {
    console.error("Failed to load admin donations report:", error);
    return NextResponse.json({ error: "Failed to load donations report" }, { status: 500 });
  }
}
