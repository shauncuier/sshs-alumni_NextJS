"use client";

import React from "react";
import { X } from "lucide-react";
import RegistrationForm from "./RegistrationForm";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";

export default function RSVPModal({
  event,
  isOpen,
  onClose,
  initialPackage,
  onRegistered,
}: {
  event: PublicEvent;
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: string;
  onRegistered: (registration: MemberRegistration, createdAccount: boolean) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Register for ${event.title}`}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {event.isMembershipEvent ? "Join the association" : "Event registration"}
            </p>
            <h2 className="text-base font-extrabold text-slate-900">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <RegistrationForm event={event} initialPackage={initialPackage} onRegistered={onRegistered} />
      </div>
    </div>
  );
}
