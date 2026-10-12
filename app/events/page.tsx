"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EventCard from "@/components/events/EventCard";
import type { PublicEvent } from "@/lib/events/types";
import { formatTaka } from "@/lib/events/pricing";
import { Calendar, Search } from "lucide-react";

function jubileePriceText(event: PublicEvent): string {
  const prices = event.packages.map((p) => p.priceAmount).filter((n) => n > 0);
  if (prices.length === 0) return "";
  let text = `From ${formatTaka(Math.min(...prices))} / person`;
  const extras: string[] = [];
  if (event.extraAdultFee > 0) extras.push(`+${formatTaka(event.extraAdultFee)} per extra adult`);
  if (event.childFee > 0) extras.push(`+${formatTaka(event.childFee)} per child under 12`);
  if (extras.length > 0) text += ` (${extras.join(", ")})`;
  return text;
}

export default function EventsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Events are unavailable right now.");
        setEvents(body.events);
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", "REUNION", "SPORTS", "WEBINAR", "COMMUNITY"];
  // Featured: the membership event, else the next big event (all text comes from the event itself).
  const jubileeEvent = events.find((e) => e.isMembershipEvent) ?? events.find((e) => e.isMegaEvent);
  const jubileePrice = jubileeEvent ? jubileePriceText(jubileeEvent) : "";

  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.locationCity.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>Gatherings &amp; Tournaments</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Alumni Events &amp; Reunions
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Reunions, batch get-togethers and other events of the alumni association. Register online and get your ticket.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    selectedCategory === cat
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat === "all" ? "All Events" : cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search event or venue..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Featured Mega Event Banner: 50 Years Golden Jubilee */}
          {selectedCategory === "all" && !search.trim() && jubileeEvent && (
            <div className="bg-gradient-to-r from-[#041a13] via-[#06281e] to-[#0b3d2c] text-white rounded-3xl border-2 border-amber-400/40 shadow-2xl overflow-hidden relative group">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
                {/* Left 7 cols: Image & Badges */}
                <div className="lg:col-span-6 relative h-64 sm:h-80 lg:h-full min-h-[300px] overflow-hidden">
                  {jubileeEvent.bannerImage && !jubileeEvent.bannerImage.startsWith("/golden-jubilee") ? (
                    // Banners can be any address an admin entered: a plain image, not the optimiser.
                    <img src={jubileeEvent.bannerImage} alt="" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  ) : (
                    <Image
                      src="/golden-jubilee.jpg"
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      loading="eager"
                      fetchPriority="high"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#06281e]" />
                  <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow">
                    {jubileeEvent.isMembershipEvent ? "Join the association" : "Featured"}
                  </div>
                </div>

                {/* Right 5 cols: Details & Action */}
                <div className="lg:col-span-6 p-6 sm:p-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/90 text-amber-300 text-xs font-bold border border-amber-400/30">
                      <Calendar className="w-3.5 h-3.5 text-amber-300" />
                      <span>{new Date(`${jubileeEvent.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{jubileeEvent.locationCity ? ` · ${jubileeEvent.locationCity}` : ""}</span>
                    </div>
                    {jubileePrice && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                        <span>{jubileePrice}</span>
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                    {jubileeEvent.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed line-clamp-4">{jubileeEvent.subtitle || jubileeEvent.description}</p>

                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                    <Link
                      href={`/events/${jubileeEvent.slug}`}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span>{jubileeEvent.isMembershipEvent ? "Details & join" : "Details & register"}</span>
                      <span>&rarr;</span>
                    </Link>
                    {jubileeEvent.attendeesCount > 0 && (
                      <span className="text-[11px] text-emerald-200">
                        {jubileeEvent.attendeesCount} already registered
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Heading for other events */}
          <div className="pt-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {selectedCategory === "all" ? "All Upcoming Gatherings & Tournaments" : `${selectedCategory} Events`}
            </h3>
            {!loading && (
              <span className="text-xs text-slate-500">
                {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>

          {loadError && <p role="alert" className="text-xs text-rose-700">{loadError}</p>}

          {loading && <p className="text-sm text-slate-500">Loading events…</p>}
          {!loading && !loadError && filteredEvents.length === 0 && (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
              <p className="text-sm font-bold text-slate-700">No events {search.trim() || selectedCategory !== "all" ? "match your search" : "yet"}</p>
              <p className="text-xs text-slate-500 mt-1">New events appear here as soon as the committee publishes them.</p>
            </div>
          )}

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
