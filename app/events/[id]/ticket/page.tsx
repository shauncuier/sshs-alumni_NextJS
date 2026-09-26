"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleTicketTiers, ReunionTicketTier } from "@/lib/career-data";
import {
  Ticket,
  CheckCircle2,
  Calendar,
  MapPin,
  Sparkles,
  QrCode,
  CreditCard,
  Printer,
  Share2,
  ArrowLeft,
  Shirt,
  Utensils,
  School
} from "lucide-react";
import Link from "next/link";

export default function ReunionTicketPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [selectedTier, setSelectedTier] = useState<ReunionTicketTier>(sampleTicketTiers[0]);
  const [attendeeName, setAttendeeName] = useState("Md. Jashedul Islam");
  const [attendeeEmail, setAttendeeEmail] = useState("jashedul@example.com");
  const [attendeePhone, setAttendeePhone] = useState("+880 1712-345678");
  const [sscBatch, setSscBatch] = useState("2008");
  const [tshirtSize, setTshirtSize] = useState("L");
  const [dietaryPreference, setDietaryPreference] = useState("Traditional Mezban Halal");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tshirtSizes = ["S (38\")", "M (40\")", "L (42\")", "XL (44\")", "XXL (46\")"];
  const dietaryOptions = [
    "Traditional Mezban Halal (Beef & Chana Dal)",
    "Chicken Mezban / Mild Diabetic Meal",
    "Pure Vegetarian Special",
  ];

  const handleBookTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/events/${eventId}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: selectedTier.id,
          tierName: selectedTier.name,
          amount: selectedTier.priceBdt,
          attendeeName,
          attendeeEmail,
          attendeePhone,
          sscBatch: parseInt(sscBatch) || 2008,
          tshirtSize,
          dietaryPreference,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ticketing failed");

      setTicketResult(data.ticket);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process reunion ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-14 border-b border-emerald-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Events</span>
            </Link>

            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 fill-amber-300" />
                <span>50th Anniversary Golden Jubilee</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Grand Reunion Delegate Pass &amp; Kit Registration
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm">
                Reserve your delegate seat, commemorative cotton t-shirt, and buffet luncheon for Sabuj Shikshayatan Government High School Reunion.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          {ticketResult ? (
            /* Digital Ticket Presentation Pass */
            <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Confirmed Delegate Pass
                </span>
                <h2 className="text-2xl font-black text-slate-900">
                  {ticketResult.attendeeName}
                </h2>
                <p className="text-xs text-slate-500">
                  SSC Batch {ticketResult.sscBatch} • {ticketResult.tierName}
                </p>
              </div>

              {/* Ticket Card Representation */}
              <div className="bg-gradient-to-br from-[#064e3b] to-[#022c22] rounded-2xl p-5 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-700/50 pb-3">
                  <div className="flex items-center gap-2">
                    <School className="w-5 h-5 text-amber-300" />
                    <div>
                      <div className="font-bold text-xs text-white">Sabuj Shikshayatan High School</div>
                      <div className="text-[10px] text-emerald-300 font-mono">EIIN 105070 • Chattogram</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/40">
                    {ticketResult.seatTable}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] text-emerald-300 block uppercase font-semibold">
                      Pass Number
                    </span>
                    <span className="font-mono font-bold text-base text-white">
                      {ticketResult.ticketNumber}
                    </span>
                    <div className="text-[11px] text-emerald-200 pt-1">
                      T-Shirt: <strong>{ticketResult.tshirtSize}</strong> • Meal: <strong>{ticketResult.dietaryPreference}</strong>
                    </div>
                  </div>

                  <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                    <img
                      src={ticketResult.qrDataUrl}
                      alt="Ticket Gate QR"
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-emerald-300/80 pt-1 border-t border-emerald-700/50 flex items-center justify-between">
                  <span>Present at Main Campus Gate 1</span>
                  <span>Fast-Track Scan</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-emerald-800 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ticket Pass</span>
                </button>

                <button
                  onClick={() => setTicketResult(null)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Book Another Pass
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left 7 cols: Ticket Tier Selection */}
              <div className="lg:col-span-7 space-y-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Select Delegate Registration Tier
                </h2>

                <div className="space-y-4">
                  {sampleTicketTiers.map((tier) => {
                    const isSelected = selectedTier.id === tier.id;
                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier)}
                        className={`p-6 rounded-3xl border transition-all cursor-pointer bg-white ${
                          isSelected
                            ? "border-emerald-600 ring-2 ring-emerald-600/30 shadow-md"
                            : "border-slate-200 hover:border-slate-300 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                              {tier.badge}
                            </span>
                            <h3 className="font-bold text-base text-slate-900 mt-2">
                              {tier.name}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              {tier.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xl font-black text-emerald-800">
                              ৳{tier.priceBdt.toLocaleString()}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-semibold">
                              BDT per pass
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                          {tier.features.map((feat, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 cols: Customization & Checkout */}
              <div className="lg:col-span-5">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl sticky top-24 space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Registration Checkout
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {selectedTier.name}
                    </h3>
                    <div className="text-xs text-emerald-800 font-bold mt-1">
                      Total Payable: ৳{selectedTier.priceBdt.toLocaleString()} BDT
                    </div>
                  </div>

                  <form onSubmit={handleBookTicket} className="space-y-4 text-xs">
                    {errorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                        {errorMsg}
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Delegate Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
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
                          value={sscBatch}
                          onChange={(e) => setSscBatch(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Phone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          value={attendeePhone}
                          onChange={(e) => setAttendeePhone(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Email Address (for Digital Ticket)
                      </label>
                      <input
                        type="email"
                        required
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    {/* Merchandise & Meal Options */}
                    {selectedTier.includesMerchandise && (
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Shirt className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Reunion T-Shirt Size</span>
                          </label>
                          <select
                            value={tshirtSize}
                            onChange={(e) => setTshirtSize(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          >
                            {tshirtSizes.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Luncheon Dietary Preference</span>
                          </label>
                          <select
                            value={dietaryPreference}
                            onChange={(e) => setDietaryPreference(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          >
                            {dietaryOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Payment Gateway */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="bKash">bKash (Merchant PGW)</option>
                        <option value="Nagad">Nagad Direct</option>
                        <option value="Card">Visa / Mastercard / Internet Banking</option>
                        <option value="Bank">Bank Wire / Secretariat Counter</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>{submitting ? "Processing..." : `Pay ৳${selectedTier.priceBdt.toLocaleString()} & Issue Pass`}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
