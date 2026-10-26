import { PaymentGateway } from "@prisma/client";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { postDonationIncome } from "@/lib/finance/posting";

type FinalizePaymentInput = {
  donationId: string;
  gateway: PaymentGateway;
  gatewaySessionKey?: string;
  merchantInvoice?: string;
  gatewayTrxId?: string;
  amount: number;
  payload: string;
};

const sameAmount = (left: number, right: number) => Math.abs(left - right) < 0.0001;

/** Marks a donation paid after a gateway confirmed it, and records the outcome in the activity log. */
export async function finalizeDonationPayment(input: FinalizePaymentInput): Promise<{ ok: boolean; alreadyCompleted?: boolean }> {
  const result = await applyPayment(input);
  const details = { gateway: input.gateway, amount: input.amount, gatewayTrxId: input.gatewayTrxId ?? null, merchantInvoice: input.merchantInvoice ?? null };
  if (!result.ok) {
    // A confirmation that does not match the stored payment (amount, gateway, invoice) may be tampering.
    await logActivity({ category: "SECURITY", action: "payment.mismatch", status: "FAILURE", summary: `Rejected ${input.gateway} confirmation for donation ${input.donationId}: details do not match`, targetType: "Donation", targetId: input.donationId, metadata: details });
  } else if (!result.alreadyCompleted) {
    await logActivity({ category: "PAYMENT", action: "payment.completed", summary: `Donation ${input.donationId} paid: ৳${input.amount} via ${input.gateway}`, targetType: "Donation", targetId: input.donationId, metadata: details });
  }
  return result;
}

async function applyPayment(input: FinalizePaymentInput): Promise<{ ok: boolean; alreadyCompleted?: boolean }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { ok: false };

  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.findUnique({
      where: { donationId: input.donationId },
      include: { donation: true },
    });
    if (!payment || payment.gateway !== input.gateway || !sameAmount(payment.amount, input.amount)) return { ok: false };
    if (input.gatewaySessionKey && payment.gatewaySessionKey !== input.gatewaySessionKey) return { ok: false };
    if (input.merchantInvoice && payment.merchantInvoice !== input.merchantInvoice) return { ok: false };
    if (!sameAmount(payment.donation.amount, input.amount)) return { ok: false };

    const completed = await tx.donation.updateMany({
      where: { id: payment.donationId, paymentStatus: { not: "COMPLETED" } },
      data: {
        paymentStatus: "COMPLETED",
        gatewayTrxId: input.gatewayTrxId ?? null,
        paidAt: new Date(),
        ipnPayload: input.payload,
      },
    });
    if (completed.count === 0) return { ok: true, alreadyCompleted: true };

    await tx.paymentTransaction.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        gatewayTrxId: input.gatewayTrxId ?? null,
        completedAt: new Date(),
        gatewayResponse: input.payload,
        callbackPayload: input.payload,
      },
    });
    await tx.donationCampaign.update({
      where: { id: payment.donation.campaignId },
      data: { raisedAmount: { increment: payment.donation.amount }, donorCount: { increment: 1 } },
    });
    await postDonationIncome(tx, payment.donationId, `gateway:${input.gateway.toLowerCase()}`);
    return { ok: true };
  });
}
