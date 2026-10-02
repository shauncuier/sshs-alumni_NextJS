"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import RegistrationForm from "@/components/events/RegistrationForm";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";
import { AlertCircle, RefreshCw } from "lucide-react";

interface RegisterClientViewProps {
  initialEvent: PublicEvent | null;
}

export default function RegisterClientView({ initialEvent }: RegisterClientViewProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [event, setEvent] = useState<PublicEvent | null>(initialEvent);
  const [message, setMessage] = useState<string | null>(
    !initialEvent ? "Membership registration opens soon." : null
  );
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);

  // If initialEvent wasn't available from SSR, fetch it on client as fallback
  useEffect(() => {
    if (!event) {
      fetch("/api/events/membership", { cache: "no-store" })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) return setMessage(body.error || "Membership registration opens soon.");
          setEvent(body.event);
          setMessage(null);
        })
        .catch(() => {
          setMessage("Could not load registration form. Please tap Retry below.");
        });
    }
  }, [event]);

  // A signed-in member may already have joined: check their status in the background
  useEffect(() => {
    if (!event || sessionStatus !== "authenticated") return;
    fetch(`/api/events/${event.slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration))
      .catch(() => setRegistration(null));
  }, [event, sessionStatus]);

  const isAuthed = sessionStatus === "authenticated" && Boolean(session?.user);

  return (
    <>
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
              onClick={() => {
                setMessage(null);
                setEvent(null);
              }}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {registration && (
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

        {event && !registration && (
          <RegistrationForm
            event={event}
            onRegistered={(r, createdAccount) => {
              if (!createdAccount) setRegistration(r);
            }}
          />
        )}
      </div>
    </>
  );
}
