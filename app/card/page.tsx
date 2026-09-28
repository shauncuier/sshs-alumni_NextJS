"use client";

import React, { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import DigitalAlumniCard, { CardData } from "@/components/card/DigitalAlumniCard";
import {
  ShieldCheck,
  Download,
  Share2,
  Printer,
  Sparkles,
  QrCode,
  Smartphone,
  ExternalLink,
  Award,
  CheckCircle2
} from "lucide-react";

export default function CardPage() {
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<{
    card: CardData;
    qrDataUrl: string;
    signedToken: string;
    verifyUrl: string;
  } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCard() {
      try {
        const res = await fetch("/api/alumni/card", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.card) throw new Error(data.error || "Could not load your digital card.");
        setCardData(data);
      } catch (err) {
        setLoadError((err as Error).message || "Could not load your digital card.");
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, []);

  // Never fall back to a sample card: an ID card must belong to the signed-in member.
  if (!cardData) {
    return (
      <div className="min-h-screen flex bg-[#f8fafc]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
          <AppHeader title="Digital Alumni Smart Card" />
          <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
            <p
              className={`text-sm ${loadError ? "text-rose-700" : "text-slate-500"}`}
              role={loadError ? "alert" : "status"}
            >
              {loading ? "Loading your digital card…" : loadError}
            </p>
          </main>
        </div>
      </div>
    );
  }

  const activeCard: CardData = cardData.card;
  const qrDataUrl = cardData.qrDataUrl;
  const signedToken = cardData.signedToken;
  const verifyUrl = cardData.verifyUrl;
  // The gate only admits verified members, so say so plainly on the card page.
  const isVerified = activeCard.status === "VERIFIED";
  const statusBadge = isVerified
    ? "🟢 Valid at the gate"
    : activeCard.status === "REJECTED"
      ? "🔴 Not valid"
      : "🟡 Pending verification";
  const validUntil = activeCard.expiresAt
    ? new Date(activeCard.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 h-screen overflow-y-auto">
        <AppHeader title="Digital Alumni Smart Card" />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#064e3b] via-[#056049] to-[#043d2e] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-emerald-700/50">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-400/10 to-transparent pointer-events-none" />
            <div className="max-w-2xl space-y-2 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVerified ? "EIIN 105070 Verified Credential" : "EIIN 105070 Member Credential"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Official Digital Alumni ID Card
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
                Your authenticated digital credential for Sabuj Shikshayatan Government High School. Present this pass at reunion gates, batch seminars, and campus library events for instant check-in.
              </p>
            </div>
          </div>

          {/* Main Grid: Card on Left, Security & Instructions on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 6 cols: Interactive 3D Card */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-700" />
                    <span>Smart Pass Preview</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border ${
                      isVerified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {statusBadge}
                  </span>
                </div>

                {!isVerified && (
                  <p role="status" className="w-full mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    {activeCard.status === "REJECTED"
                      ? "Your membership verification was not approved, so this pass is not accepted at the gate. Please contact the alumni committee."
                      : "This pass is not accepted at the gate until the committee verifies your membership."}
                  </p>
                )}

                <DigitalAlumniCard
                  card={activeCard}
                  qrDataUrl={qrDataUrl}
                  signedToken={signedToken}
                  verifyUrl={verifyUrl}
                />
              </div>
            </div>

            {/* Right 6 cols: Security Features, Gate Instructions & Wallets */}
            <div className="lg:col-span-6 space-y-6">
              {/* Gate Pass Instructions */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Reunion Gate Scan Protocol
                    </h3>
                    <p className="text-xs text-slate-500">
                      How security volunteers verify your access on campus
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      1
                    </span>
                    <p className="pt-0.5">
                      Open your digital card on your phone or Apple/Google Wallet pass before approaching the school gate.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      2
                    </span>
                    <p className="pt-0.5">
                      Flip to the QR code side. Security volunteers will scan with their mobile portal scanner.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
                      3
                    </span>
                    <p className="pt-0.5">
                      Instant green verification badge confirms your batch year, name, and registered delegate kit.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Test Public Gate Verification Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Security & Verification Details */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Credential Integrity
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">EIIN Code</span>
                    <span className="font-bold text-slate-800">105070 (Government)</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Pass Protection</span>
                    <span className="font-mono font-bold text-emerald-800">AES-256-GCM</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Alumni Tier</span>
                    <span className="font-bold text-amber-700">{activeCard.membershipTier || "LIFETIME"}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Validity</span>
                    <span className="font-bold text-slate-800">{validUntil ? `Until ${validUntil}` : "No expiry"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
