"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleDonations } from "@/lib/data";
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  Users,
  Target,
  Sparkles,
  CreditCard,
  Building
} from "lucide-react";

export default function DonatePage() {
  const [selectedCampaign, setSelectedCampaign] = useState(sampleDonations[0].id);
  const [amount, setAmount] = useState<number | string>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("Md. Jashedul Islam");
  const [donorBatch, setDonorBatch] = useState("2008");
  const [donorEmail, setDonorEmail] = useState("jashedul@example.com");
  const [donorPhone, setDonorPhone] = useState("01712345678");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{
    receiptId: string;
    gateway: string;
    amount: number;
    redirectUrl?: string;
    instructions?: string[];
  } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const activeCampaign =
    sampleDonations.find((c) => c.id === selectedCampaign) || sampleDonations[0];

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const donationAmt = parseFloat(String(amount));
    if (!donationAmt || donationAmt <= 0) {
      setErrorMsg("Please enter a valid donation amount.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign,
          amount: donationAmt,
          donorName,
          donorEmail,
          donorPhone,
          donorBatch,
          paymentMethod,
          isAnonymous,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment initiation failed");
      }

      setReceiptData({
        receiptId: data.receiptId || `SSGHS-DON-${Date.now().toString().slice(-8)}`,
        gateway: data.gateway || paymentMethod,
        amount: donationAmt,
        redirectUrl: data.redirectUrl,
        instructions: data.instructions,
      });

      setSubmitted(true);

      // If gateway provides an external redirect URL (production or live sandbox)
      if (data.redirectUrl && data.redirectUrl !== window.location.href) {
        // Automatically redirect or let the user click if desired
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      console.error("[Donation Error]", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const presetAmounts = [500, 1000, 5000, 10000];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Heart className="w-3.5 h-3.5 fill-amber-300" />
                <span>Giving Back to Alma Mater</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Give Back to the School That Shaped You
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Support scholarships for needy students, finance our cutting-edge STEM laboratory, and provide emergency relief to teachers in need. Transparent, audited, and impactful.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left 7 cols: Campaigns List */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-xl font-bold text-slate-900">
                Active Alumni Initiatives &amp; Funds
              </h2>

              <div className="space-y-4">
                {sampleDonations.map((campaign) => {
                  const percent = Math.min(
                    Math.round((campaign.raisedAmount / campaign.goalAmount) * 100),
                    100
                  );
                  const isSelected = campaign.id === selectedCampaign;

                  return (
                    <div
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign.id)}
                      className={`p-6 rounded-3xl border transition-all cursor-pointer bg-white ${
                        isSelected
                          ? "border-emerald-600 ring-2 ring-emerald-600/30 shadow-md"
                          : "border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                            {campaign.category}
                          </span>
                          <h3 className="font-bold text-base text-slate-900 mt-2">
                            {campaign.title}
                          </h3>
                        </div>
                        {isSelected && (
                          <span className="p-1 rounded-full bg-emerald-600 text-white shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {campaign.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-emerald-800">
                            Raised: ৳{campaign.raisedAmount.toLocaleString()} ({percent}%)
                          </span>
                          <span className="text-slate-500">
                            Goal: ৳{campaign.goalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>{campaign.donorCount} Generous Contributors</span>
                          <span>{campaign.daysLeft} days remaining</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 cols: Contribution Form */}
            <div className="lg:col-span-5">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl sticky top-24 space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Contribution Checkout
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {activeCampaign.title}
                  </h3>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <span className="font-bold">Error:</span> {errorMsg}
                  </div>
                )}

                {submitted && receiptData ? (
                  <div className="py-6 space-y-4">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-slate-800">Payment Initiated / Recorded</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Thank you for supporting Sabuj Shikshayatan. Your contribution helps empower our students.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Receipt ID:</span>
                        <span className="font-mono font-bold text-slate-800">{receiptData.receiptId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-bold text-emerald-700">৳{receiptData.amount.toLocaleString()} BDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Selected Gateway:</span>
                        <span className="font-bold text-slate-800 uppercase">{receiptData.gateway}</span>
                      </div>
                    </div>

                    {receiptData.instructions && receiptData.instructions.length > 0 && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs space-y-1.5">
                        <span className="font-bold text-amber-900 block">Transfer Instructions:</span>
                        {receiptData.instructions.map((ins, idx) => (
                          <p key={idx} className="text-amber-800 text-[11px] leading-relaxed">
                            {ins}
                          </p>
                        ))}
                      </div>
                    )}

                    {receiptData.redirectUrl && (
                      <a
                        href={receiptData.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Complete Payment at Gateway</span>
                        <CreditCard className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setReceiptData(null);
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Make Another Contribution
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePledge} className="space-y-4 text-xs">
                    {/* Select preset amount */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-2">
                        Select Amount (BDT ৳)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {presetAmounts.map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => {
                              setAmount(amt);
                              setCustomAmount("");
                            }}
                            className={`py-2.5 rounded-xl font-bold border transition-colors ${
                              amount === amt && !customAmount
                                ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-600"
                            }`}
                          >
                            ৳{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="Or enter custom amount in ৳"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setAmount(e.target.value);
                          }}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Donor Details */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Donor Name
                        </label>
                        <input
                          type="text"
                          required
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={donorEmail}
                            onChange={(e) => setDonorEmail(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Mobile (for SMS)
                          </label>
                          <input
                            type="tel"
                            required
                            value={donorPhone}
                            onChange={(e) => setDonorPhone(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            SSC Batch
                          </label>
                          <input
                            type="text"
                            required
                            value={donorBatch}
                            onChange={(e) => setDonorBatch(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Payment Gateway
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          >
                            <option value="bKash">bKash (Merchant / PGW)</option>
                            <option value="Nagad">Nagad (Direct API)</option>
                            <option value="SSLCommerz">SSLCommerz (Cards/MFS)</option>
                            <option value="Bank">Bank Deposit / Cheque</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="anon"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <label htmlFor="anon" className="text-slate-600 cursor-pointer">
                          Make donation anonymous on public donor ledger
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      <span>{isLoading ? "Processing with Gateway..." : "Proceed to Confirm Contribution"}</span>
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Audited by Sabuj Shikshayatan Alumni Executive Council</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
