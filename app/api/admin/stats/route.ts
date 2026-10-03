import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

export async function GET() {
  try {
    const me = await getSessionUser();
    if (!me || !isAdminRole(me.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Run aggregations in parallel for maximum performance
    const [
      totalRegistered,
      registeredThisWeek,
      verifiedAlumni,
      pendingReview,
      batchProfiles,
      confirmedRegistrations,
      donationDrives,
      jubileeEvent,
    ] = await Promise.all([
      // Total registered users
      prisma.user.count(),

      // Registered within last 7 days
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      // Verified alumni
      prisma.user.count({
        where: { status: "VERIFIED" },
      }),

      // Pending review requests
      prisma.verificationRequest.count({
        where: { status: "PENDING" },
      }),

      // Batches represented
      prisma.alumniProfile.findMany({
        where: { sscBatch: { gt: 0 } },
        select: { sscBatch: true },
      }),

      // Funds collected from confirmed event registrations & donations
      prisma.eventRegistration.findMany({
        where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        select: { totalFee: true, donationAmount: true },
      }),

      // Active donation campaigns
      prisma.donationCampaign.findMany({
        where: { isActive: true },
        select: { raisedAmount: true },
      }),

      // Jubilee / Reunion Event
      prisma.event.findFirst({
        where: { isMembershipEvent: true },
        select: {
          id: true,
          title: true,
          date: true,
          attendeesCount: true,
          registrations: {
            where: { status: { in: ["CONFIRMED", "CHECKED_IN"] } },
            select: { id: true, headCount: true },
          },
        },
      }),
    ]);

    // Calculate unique active batches
    const uniqueBatches = Array.from(
      new Set(
        batchProfiles
          .map((p) => p.sscBatch)
          .filter((b): b is number => typeof b === "number" && b > 1900)
      )
    ).sort((a, b) => a - b);

    const activeBatchesCount = uniqueBatches.length;
    const batchRange =
      uniqueBatches.length > 0
        ? `${uniqueBatches[0]} — ${uniqueBatches[uniqueBatches.length - 1]}`
        : "1970 — Present";

    // Verification rate
    const verificationRate =
      totalRegistered > 0
        ? Math.round((verifiedAlumni / totalRegistered) * 100)
        : 100;

    // Total funds raised (from donation campaigns and voluntary donations)
    const campaignTotalFunds = donationDrives.reduce(
      (sum, d) => sum + (d.raisedAmount || 0),
      0
    );
    const voluntaryDonations = confirmedRegistrations.reduce(
      (sum, r) => sum + (r.donationAmount || 0),
      0
    );
    const totalFunds = campaignTotalFunds + voluntaryDonations;

    // Format funds in Bangladeshi standard (Lakhs if >= 100,000)
    let fundsFormatted = `৳${totalFunds.toLocaleString()}`;
    if (totalFunds >= 100000) {
      fundsFormatted = `৳${(totalFunds / 100000).toFixed(1)}L`;
    }

    // Reunion RSVPs: headCount of confirmed attendees
    const reunionRsvpCount = jubileeEvent
      ? jubileeEvent.registrations.reduce((acc, r) => acc + (r.headCount || 1), 0)
      : 0;

    const reunionTitle = jubileeEvent
      ? jubileeEvent.title.length > 25
        ? jubileeEvent.title.substring(0, 25) + "…"
        : jubileeEvent.title
      : "Golden Jubilee";

    return NextResponse.json({
      stats: {
        totalRegistered,
        registeredThisWeek,
        verifiedAlumni,
        pendingReview,
        verificationRate,
        activeBatchesCount,
        batchRange,
        totalFunds,
        fundsFormatted,
        activeDrivesCount: donationDrives.length || 1,
        reunionRsvpCount,
        reunionTitle,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json({ error: "Failed to load admin stats" }, { status: 500 });
  }
}
