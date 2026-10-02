import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getMembershipEvent } from "@/lib/events/service";
import RegisterClientView from "./RegisterClientView";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const event = await getMembershipEvent();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Join the SSGHS Alumni Association
        </h1>
        <RegisterClientView initialEvent={event} />
      </main>
      <Footer />
    </div>
  );
}
