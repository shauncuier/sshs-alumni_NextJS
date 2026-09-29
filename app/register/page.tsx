"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RegistrationForm from "@/components/events/RegistrationForm";
import type { PublicEvent } from "@/lib/events/types";

// Joining the association is the membership event's (Golden Jubilee's) paid registration.
export default function RegisterPage() {
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events/membership", { cache: "no-store" }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) return setMessage(body.error || "Membership registration opens soon.");
      setEvent(body.event);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Join the SSGHS Alumni Association</h1>
        {event && (
          <p className="text-sm text-slate-600">
            Membership is through the <strong>{event.title}</strong> registration. Fill in your details, pay, and enter your
            transaction ID; the committee confirms your payment and verifies your membership together.
          </p>
        )}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
          {!message && !event && <p role="status" className="text-xs text-slate-500">Loading…</p>}
          {event && <RegistrationForm event={event} onRegistered={() => router.push("/dashboard")} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
