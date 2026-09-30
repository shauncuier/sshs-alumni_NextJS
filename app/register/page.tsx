"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RegistrationForm from "@/components/events/RegistrationForm";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";

// Joining the association is the membership event's (Golden Jubilee's) paid registration.
export default function RegisterPage() {
  const { status: sessionStatus } = useSession();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState(false);

  useEffect(() => {
    fetch("/api/events/membership", { cache: "no-store" }).then(async (res) => {
      const body = await res.json();
      if (!res.ok) return setMessage(body.error || "Membership registration opens soon.");
      setEvent(body.event);
    });
  }, []);

  // A signed-in member may already have joined: show their status instead of the form.
  useEffect(() => {
    if (!event || sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") return;
    fetch(`/api/events/${event.slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration))
      .finally(() => setFetchedRegistration(true));
  }, [event, sessionStatus]);

  const ready = event && (sessionStatus === "unauthenticated" || fetchedRegistration);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Join the SSGHS Alumni Association</h1>
        {event && !registration && (
          <p className="text-sm text-slate-600">
            Membership is through the <strong>{event.title}</strong> registration. Fill in your details, pay, and enter your
            transaction ID; the committee confirms your payment and verifies your membership together.
            {sessionStatus === "unauthenticated" && (
              <> New members add a profile photo and a document that shows they studied at SSGHS (for example an SSC certificate or marksheet).</>
            )}
          </p>
        )}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
          {!message && !ready && <p role="status" className="text-xs text-slate-500">Loading…</p>}
          {ready && registration && (
            <div role="status" className="space-y-3 text-sm">
              <p className="font-bold text-emerald-900">
                {registration.status === "PENDING_PAYMENT"
                  ? "Registered — payment and membership under review"
                  : registration.status === "CANCELLED"
                    ? "Your registration was cancelled"
                    : "Registered"}
              </p>
              {registration.ticket && (
                <img src={registration.ticket.qrDataUrl} alt="Event ticket QR code" className="w-40 h-40 bg-white rounded-xl border" />
              )}
              <button
                type="button"
                onClick={() => window.location.assign("/dashboard")}
                className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Go to your dashboard
              </button>
            </div>
          )}
          {ready && !registration && <RegistrationForm event={event} onRegistered={(r, createdAccount) => {
            // A new member sees the form's "under review" message; they are not signed in.
            if (!createdAccount) setRegistration(r);
          }} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
