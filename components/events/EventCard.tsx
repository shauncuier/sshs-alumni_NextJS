"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Clock, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { EventItem } from "@/lib/data";
import type { PublicEvent } from "@/lib/events/types";
import RSVPModal from "./RSVPModal";

interface EventCardProps {
  event: EventItem;
}

export default function EventCard({ event }: EventCardProps) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const eventDate = new Date(event.date);
  const day = eventDate.getDate();
  const month = eventDate.toLocaleString("default", { month: "short" });
  const year = eventDate.getFullYear();

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
        {/* Banner with overlay */}
        <div className="relative h-48 overflow-hidden bg-slate-900">
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Date Stamp Pill */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-2 text-center shadow-lg border border-emerald-100 min-w-[50px]">
            <span className="block text-lg font-black text-emerald-900 leading-none">{day}</span>
            <span className="block text-[10px] font-bold uppercase text-emerald-700 tracking-wider mt-0.5">{month}</span>
          </div>

          {/* Category Tag */}
          <div className="absolute top-3 right-3 bg-[#06281e]/90 text-amber-300 font-extrabold px-3 py-1 rounded-xl text-[11px] border border-amber-400/40 tracking-wider">
            {event.category}
          </div>

          {/* Attendee count */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{event.attendeesCount} / {event.maxAttendees} Attending</span>
            {event.closedMessage ? (
              <span className="text-[11px] font-bold text-rose-700">{event.closedMessage}</span>
            ) : typeof event.placesLeft === "number" ? (
              <span className="text-[11px] font-semibold text-emerald-700">{event.placesLeft} places left</span>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-2">
              {event.title}
            </h3>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="line-clamp-1">{event.venue}, {event.locationCity}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => setRsvpOpen(true)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                isRegistered
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-emerald-800 hover:bg-emerald-700 text-white"
              }`}
            >
              {isRegistered ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> RSVP Confirmed
                </>
              ) : (
                <span>RSVP / Register</span>
              )}
            </button>
            <Link
              href={`/events/${event.slug ?? event.id}`}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="View Event Details"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <RSVPModal
        // EventCard is always rendered from list/home pages backed by /api/events or
        // listPublicEvents(), which return full PublicEvent objects; the card's own
        // prop is typed as the looser EventItem so it can also be used with static data.
        event={event as unknown as PublicEvent}
        isOpen={rsvpOpen}
        onClose={() => setRsvpOpen(false)}
        onRegistered={() => {
          setIsRegistered(true);
          setRsvpOpen(false);
        }}
      />
    </>
  );
}
