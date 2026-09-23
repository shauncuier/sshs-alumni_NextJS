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
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeCampaign =
    sampleDonations.find((c) => c.id === selectedCampaign) || sampleDonations[0];

  const handlePledge = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // simulate success
    }, 1000);
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

                {submitted ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">Thank You For Giving Back!</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your contribution pledge has been recorded. The transaction reference has been sent to your registered email address.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
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
                            <option value="bKash">bKash (Merchant)</option>
                            <option value="Nagad">Nagad (Merchant)</option>
                            <option value="Card">Visa / Mastercard</option>
                            <option value="Bank">Bank Deposit</option>
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
                      className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Heart className="w-4 h-4 fill-white" />
                      <span>Proceed to Confirm Contribution</span>
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
