import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity, logFailure } from "@/lib/activity-log";
import { decideDonation, type DonationDecision } from "@/lib/donations";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { getSessionUser, isAdminRole } from "@/lib/session-user";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/donations/[id] — { action: "VERIFY" } or { action: "REJECT", reason }
export async function PATCH(req: Request, { params }: Params) {
  const me = await getSessionUser();
  const { id } = await params;
  try {
    requireSameOrigin(req);
    if (!me || !isAdminRole(me.role)) throw new AppError("FORBIDDEN", 403, "Only administrators can verify donations.");
    const { action, reason } = await readJsonBody(req);
    const donation = await decideDonation({ donationId: id, decision: action as DonationDecision, reason, adminEmail: me.email });
    await logActivity({
      category: "PAYMENT",
      action: action === "VERIFY" ? "donation.verified" : "donation.rejected",
      summary: `${action === "VERIFY" ? "Verified" : "Rejected"} donation of ৳${donation.amount} from ${donation.donorName} (${donation.paymentMethod} ${donation.transactionRef ?? ""})`,
      actor: me,
      targetType: "Donation",
      targetId: donation.id,
      metadata: { amount: donation.amount, campaign: donation.campaign.title, reason: action === "REJECT" ? reason : undefined },
      req,
    });
    return NextResponse.json({ donation: { id: donation.id, paymentStatus: donation.paymentStatus, paidAt: donation.paidAt, failureReason: donation.failureReason } });
  } catch (err) {
    await logFailure(err, { category: "PAYMENT", action: "donation.decision_refused", actor: me, targetType: "Donation", targetId: id, req });
    return errorResponse(err, "PATCH /api/admin/donations/[id]");
  }
}
