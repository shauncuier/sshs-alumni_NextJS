"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RSVPModal from "@/components/events/RSVPModal";
import { sampleEvents } from "@/lib/data";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  ArrowLeft,
  Share2,
  CheckCircle2,
  ListOrdered
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = use(params);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [registered, setRegistered] = useState(false);

  const event =
    sampleEvents.find((e) => e.id === resolvedParams.id) || sampleEvents[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Banner */}
        <div className="relative h-72 sm:h-96 bg-slate-900 overflow-hidden">
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06281e] via-[#06281e]/60 to-transparent" />

          <div className="absolute top-6 left-4 sm:left-8">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Events
            </Link>
          </div>

          <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 text-white max-w-4xl">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider mb-2">
              {event.category}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-emerald-200 mt-2">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {event.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {event.time}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {event.venue}, {event.locationCity}
              </span>
            </div>
          </div>
        </div>

        {/* Content & RSVP action */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Details */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-slate-900">About this Event</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              {/* Agenda Section */}
              {event.agenda && event.agenda.length > 0 && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <ListOrdered className="w-5 h-5 text-emerald-700" />
                    <span>Event Schedule &amp; Agenda</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {event.agenda.map((item, idx) => (
                      <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                        <span className="font-bold text-emerald-800 sm:w-28 shrink-0">
                          {item.time}
                        </span>
                        <span className="text-slate-700 font-medium">
                          {item.activity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: RSVP Widget */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-lg space-y-5 sticky top-24">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Registration Status
                  </span>
                  <div className="text-2xl font-black text-slate-900">
                    Free / Included for Alumni
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>{event.attendeesCount} alumni registered so far</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setRsvpOpen(true)}
                    className={`w-full py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                      registered
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-emerald-800 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {registered ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" /> RSVP Confirmed!
                      </>
                    ) : (
                      <span>Reserve My Seat / RSVP</span>
                    )}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Organized By:</span>
                    <span className="font-bold text-slate-900">{event.organizer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Capacity:</span>
                    <span className="font-bold text-slate-900">{event.maxAttendees} Guests</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Souvenir T-shirt:</span>
                    <span className="font-bold text-emerald-700">Included with RSVP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <RSVPModal
        event={event}
        isOpen={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        onSuccess={() => {
          setRegistered(true);
          setRsvpOpen(false);
        }}
      />
    </div>
  );
}
