import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMembershipEvent } from "@/lib/events/service";
import RegisterClientView from "./RegisterClientView";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("register"), path: "/register", title: "Join the association", description: "Become a member of the Sabuj Shikshayatan alumni association: register for the Golden Jubilee 2026, pay by bKash or Nagad and get your member card." });

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const event = await getMembershipEvent();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white font-black text-xs">
              ▶
            </span>
            <div>
              <p className="font-bold text-emerald-950">রেজিস্ট্রেশন করতে সহায়তা প্রয়োজন?</p>
              <p className="text-emerald-800 text-[11px]">ভিডিও টিউটোরিয়াল দেখুন অথবা পূর্ণাঙ্গ পিডিএফ নির্দেশিকা ডাউনলোড করুন।</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/guide"
              className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold transition shadow-xs"
            >
              ভিডিও দেখুন
            </Link>
            <a
              href="/docs/ssghs-registration-guide.pdf"
              download="SSGHS-Registration-Guide.pdf"
              className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-900 font-bold transition shadow-xs"
            >
              PDF Guide
            </a>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Join the SSGHS Alumni Association
        </h1>
        <RegisterClientView initialEvent={event} />
      </main>
      <Footer />
    </div>
  );
}
