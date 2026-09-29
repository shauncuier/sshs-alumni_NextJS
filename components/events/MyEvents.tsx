"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { MemberRegistration } from "@/lib/events/types";
import { formatTaka } from "@/lib/events/pricing";

const STATUS_TEXT: Record<MemberRegistration["status"], string> = {
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  CANCELLED: "Cancelled",
  PENDING_PAYMENT: "", // Handled separately based on isMembershipEvent
};

function getStatusText(registration: MemberRegistration): string {
  if (registration.status === "PENDING_PAYMENT") {
    return registration.isMembershipEvent
      ? "Pending — payment and membership under review"
      : "Pending — payment under review";
  }
  return STATUS_TEXT[registration.status];
}

export default function MyEvents() {
  const [registrations, setRegistrations] = useState<MemberRegistration[] | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/registrations", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registrations: [] }))
      .then((body) => setRegistrations(body.registrations));
  }, []);

  if (!registrations || registrations.length === 0) return null;
  return (
    <section className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
      <h3 className="font-bold text-sm text-slate-900">My Events</h3>
      <ul className="space-y-3">
        {registrations.map((r) => (
          <li key={r.id} className="text-xs border-t border-slate-100 pt-3 first:border-0 first:pt-0 space-y-1">
            <Link href={`/events/${r.eventSlug}`} className="font-bold text-slate-900 hover:underline">
              {r.eventTitle}
            </Link>
            <div className="text-slate-500">
              {r.eventDate} · {r.headCount} {r.headCount === 1 ? "person" : "people"} · {formatTaka(r.totalFee + r.donationAmount)}
            </div>
            <div
              className={
                r.status === "PENDING_PAYMENT"
                  ? "text-amber-700 font-semibold"
                  : r.status === "CANCELLED"
                    ? "text-rose-700 font-semibold"
                    : "text-emerald-700 font-semibold"
              }
            >
              {getStatusText(r)}
            </div>
            {r.ticket && (
              <button
                type="button"
                onClick={() => setOpenTicket(openTicket === r.id ? null : r.id)}
                className="text-emerald-800 font-bold underline"
              >
                {openTicket === r.id ? "Hide ticket" : "Show ticket"}
              </button>
            )}
            {r.ticket && openTicket === r.id && (
              <img src={r.ticket.qrDataUrl} alt={`Ticket for ${r.eventTitle}`} className="w-44 h-44 bg-white border rounded-xl" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
