"use client";

import React, { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { IdCardBack, IdCardFront, siteHost } from "@/components/card/MemberIdCard";
import IdCardPrintSheet, { printCardSheet } from "@/components/card/IdCardPrintSheet";
import type { MemberCard } from "@/lib/member-card";
import { ExternalLink, Printer, QrCode, ShieldCheck } from "lucide-react";

export default function CardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ card: MemberCard; origin: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alumni/card", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.card) throw new Error(body.error || "Could not load your membership card.");
        setData({ card: body.card, origin: body.origin });
      })
      .catch((err: Error) => setLoadError(err.message || "Could not load your membership card."))
      .finally(() => setLoading(false));
  }, []);

  const card = data?.card;
  const isVerified = card?.status === "VERIFIED";
  const site = data ? siteHost(data.origin) : "";

  return (
    <div className="min-h-screen flex bg-[#f4f6f5]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 h-screen overflow-y-auto">
        <AppHeader title="Membership Card" />

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Never a sample card: an ID card must belong to the signed-in member. */}
          {!card ? (
            <p className={`text-sm ${loadError ? "text-rose-700" : "text-slate-500"}`} role={loadError ? "alert" : "status"}>
              {loading ? "Loading your membership card…" : loadError}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Your membership card</h1>
                  <p className="text-xs sm:text-sm text-slate-500">Show it on your phone or print it. The QR code on the back is checked at the gate.</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    isVerified ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  {isVerified ? "Valid member" : card.status === "REJECTED" ? "Not valid" : "Waiting for approval"}
                </span>
              </div>

              {!isVerified && (
                <p role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {card.status === "REJECTED"
                    ? "Your membership was not approved, so this card is not accepted at the gate. Please contact the alumni committee."
                    : "This card is not accepted at the gate until the committee approves your membership."}
                </p>
              )}

              {/* The card at its real proportions, scaled up for the screen */}
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8">
                <div className="flex flex-col xl:flex-row items-center justify-center gap-6 sm:gap-8">
                  <figure className="space-y-2 text-center">
                    <div className="[zoom:1.02] min-[400px]:[zoom:1.1] sm:[zoom:1.45] xl:[zoom:1.3] rounded-[3mm] shadow-xl shadow-emerald-950/15">
                      <IdCardFront card={card} />
                    </div>
                    <figcaption className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Front</figcaption>
                  </figure>
                  <figure className="space-y-2 text-center">
                    <div className="[zoom:1.02] min-[400px]:[zoom:1.1] sm:[zoom:1.45] xl:[zoom:1.3] rounded-[3mm] shadow-xl shadow-emerald-950/15">
                      <IdCardBack card={card} site={site} />
                    </div>
                    <figcaption className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Back · gate QR</figcaption>
                  </figure>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void printCardSheet()}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print my card
                  </button>
                  <a
                    href={card.verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    Check my QR code <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                  <QrCode className="w-5 h-5 text-emerald-700 shrink-0" />
                  <p>At the gate, open this page or show your printed card. Volunteers scan the QR on the back.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                  <Printer className="w-5 h-5 text-emerald-700 shrink-0" />
                  <p>Printing: A4 paper, scale 100% (actual size). Cut out both sides and laminate them back to back.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <p>The QR code is signed by the association and cannot be copied onto another name.</p>
                </div>
              </section>

              <IdCardPrintSheet cards={[card]} site={site} mode="pair" />
            </>
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
