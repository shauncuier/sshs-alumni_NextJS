import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity, logFailure } from "@/lib/activity-log";
import { createManualDonation } from "@/lib/donations";
import { listOpenCampaigns } from "@/lib/campaigns";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser } from "@/lib/session-user";

// GET /api/donations — fundraising campaigns open for donations (not closed, started, not ended).
export async function GET() {
  try {
    return NextResponse.json({ campaigns: await listOpenCampaigns() });
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
