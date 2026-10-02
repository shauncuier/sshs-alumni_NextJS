"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RegistrationForm from "@/components/events/RegistrationForm";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

// Joining the association is the membership event's (Golden Jubilee's) paid registration.
export default function RegisterPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [fetchedRegistration, setFetchedRegistration] = useState(false);
  const [fetchAttempts, setFetchAttempts] = useState(0);

  const loadEvent = () => {
    setMessage(null);
    fetch("/api/events/membership", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) return setMessage(body.error || "Membership registration opens soon.");
        setEvent(body.event);
      })
      .catch((err) => {
        console.error("Failed to load membership event:", err);
        setMessage("Could not load registration form. Please tap Retry below.");
      });
  };

  useEffect(() => {
    loadEvent();
  }, [fetchAttempts]);

  // A signed-in member may already have joined: check their status in the background
  useEffect(() => {
    if (!event || sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") {
        setFetchedRegistration(true);
      }
      return;
    }
    fetch(`/api/events/${event.slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration))
      .catch(() => setRegistration(null))
      .finally(() => setFetchedRegistration(true));
  }, [event, sessionStatus]);

  // Mobile-first: Never block unauthenticated visitors behind slow session resolution!
  const isAuthed = sessionStatus === "authenticated" && Boolean(session?.user);
  const ready = Boolean(event) && (!isAuthed || fetchedRegistration);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Join the SSGHS Alumni Association
        </h1>

        {event && !registration && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Membership is through the <strong>{event.title}</strong> registration. Fill in your details, pay, and enter your
            transaction ID; the committee confirms your payment and verifies your membership together.
            {!isAuthed && (
              <> New members add a profile photo and a document that shows they studied at SSGHS (for example an SSC certificate or marksheet).</>
            )}
          </p>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          {message && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>{message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFetchAttempts((c) => c + 1)}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!message && !ready && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-800" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Loading registration form…</p>
                <p className="text-[11px] text-slate-400">Connecting to SSGHS official member portal</p>
              </div>
            </div>
          )}

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
                onClick={() => router.push("/dashboard")}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Go to your dashboard
              </button>
            </div>
          )}

          {ready && !registration && (
            <RegistrationForm
              event={event!}
              onRegistered={(r, createdAccount) => {
                // A new member sees the form's "under review" message; they are not signed in.
                if (!createdAccount) setRegistration(r);
              }}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
