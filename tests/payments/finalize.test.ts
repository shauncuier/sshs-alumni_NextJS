import { beforeEach, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { finalizeDonationPayment } from "@/lib/payments/finalize";
import { resetDatabase } from "../helpers/db";

async function pendingPayment() {
  const campaign = await prisma.donationCampaign.create({
    data: { slug: "payment-security", title: "Payment Security", description: "Regression test" },
  });
  const donation = await prisma.donation.create({
    data: {
      campaignId: campaign.id,
      donorName: "Test Donor",
      amount: 500,
      paymentMethod: "SSLCommerz",
      paymentGateway: "SSLCOMMERZ",
      paymentStatus: "PENDING",
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      donationId: donation.id,
      gateway: "SSLCOMMERZ",
      gatewaySessionKey: "session-1",
      merchantInvoice: "invoice-1",
      amount: 500,
      status: "PENDING",
    },
  });
  return { campaign, donation };
}

describe("finalizeDonationPayment", () => {
  beforeEach(resetDatabase);

  it("binds completion to the stored gateway reference and amount", async () => {
    const { campaign, donation } = await pendingPayment();
    const result = await finalizeDonationPayment({
      donationId: donation.id,
      gateway: "SSLCOMMERZ",
      merchantInvoice: "wrong-invoice",
      gatewayTrxId: "gateway-1",
      amount: 500,
      payload: "{}",
    });
    expect(result).toEqual({ ok: false });
    expect((await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).paymentStatus).toBe("PENDING");
    expect((await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).raisedAmount).toBe(0);
  });

  it("records a valid payment and campaign total exactly once", async () => {
    const { campaign, donation } = await pendingPayment();
    const input = {
      donationId: donation.id,
      gateway: "SSLCOMMERZ" as const,
      merchantInvoice: "invoice-1",
      gatewayTrxId: "gateway-1",
      amount: 500,
      payload: "{}",
    };
    const first = await finalizeDonationPayment(input);
    const replay = await finalizeDonationPayment(input);
    expect(first.ok).toBe(true);
    expect(replay.ok).toBe(true);
    const storedCampaign = await prisma.donationCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    const storedDonation = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } });
    expect(storedDonation.paymentStatus).toBe("COMPLETED");
    expect(storedCampaign).toMatchObject({ raisedAmount: 500, donorCount: 1 });
  });
});
