"use client";

import React, { useState, useEffect, use } from "react";
import { schoolInfo } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RSVPModal from "@/components/events/RSVPModal";
import type { PublicEvent, MemberRegistration } from "@/lib/events/types";
import { formatTaka, formatDeadline } from "@/lib/events/pricing";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  BookOpen,
  PhoneCall,
  Info,
  ChevronRight,
  Gift,
  Flame,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = use(params);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Bumped by "Try again" to fetch again without reloading the page.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    fetch(`/api/events/${slug}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return setMissing(true);
        if (!res.ok) throw new Error(`Event request failed (${res.status})`);
        setEvent((await res.json()).event);
      })
      .catch(() => setLoadError(true));
    fetch(`/api/events/${slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration))
      // Not knowing the member's own registration only hides their status; the event still shows.
      .catch(() => setRegistration(null));
  }, [slug, attempt]);

  if (missing) notFound();
  if (loadError) {
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-bold text-rose-700">We couldn&apos;t load this event. Please check your connection and try again.</p>
        <button
          onClick={() => {
            setLoadError(false);
            setAttempt((n) => n + 1);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white"
        >
          Try again
        </button>
        <Link href="/events" className="text-xs font-bold text-emerald-800 hover:underline">
          Back to all events
        </Link>
      </div>
    );
  }
  if (!event) {
    return (
      <div role="status" className="min-h-screen flex items-center justify-center text-xs text-slate-500">
        Loading event…
      </div>
    );
  }
  return <EventDetailView event={event} registration={registration} onRegistered={setRegistration} />;
}

function EventDetailView({
  event,
  registration,
  onRegistered,
}: {
  event: PublicEvent;
  registration: MemberRegistration | null;
  onRegistered: (r: MemberRegistration) => void;
}) {
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>(undefined);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Countdown State for Golden Jubilee
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });


  useEffect(() => {
    const dateStr = event.date ? `${event.date}T08:30:00+06:00` : "2026-12-30T08:30:00+06:00";
    const targetDate = new Date(dateStr).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event.date]);

  const handleOpenRsvpWithPackage = (pkgName?: string) => {
    setSelectedPackage(pkgName);
    setRsvpOpen(true);
  };

  const isGoldenJubilee = event.isMegaEvent;

  // With packages the price starts at the cheapest package; otherwise it is the flat fee.
  const lowestPackagePrice = event.packages.length > 0 ? Math.min(...event.packages.map((p) => p.priceAmount)) : null;
  const priceLabel =
    lowestPackagePrice === null
      ? formatTaka(event.registrationFeeAmount)
      : lowestPackagePrice > 0
        ? `From ${formatTaka(lowestPackagePrice)}`
        : "Free";
  const isPaid =
    event.registrationFeeAmount > 0 ||
    event.packages.some((p) => p.priceAmount > 0) ||
    event.guestTypes.some((g) => g.price > 0);
  const paidGuests = event.guestTypes.filter((g) => g.price > 0);

  // Multi-day agendas label each item "Day N (...) - time"; one tab per day, in order.
  const dayOf = (time: string) => /^(Day \d+(?: \([^)]*\))?)/i.exec(time)?.[1] ?? null;
  const agendaDays = Array.from(new Set((event.agenda ?? []).map((a) => dayOf(a.time)).filter((d): d is string => Boolean(d))));
  const selectedDay = activeDay && agendaDays.includes(activeDay) ? activeDay : agendaDays[0] ?? null;
  const currentDisplayAgenda = (event.agenda ?? []).filter((a) => !selectedDay || dayOf(a.time) === selectedDay);


  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Banner Section */}
        <div className="relative min-h-[380px] sm:min-h-[460px] bg-slate-950 overflow-hidden flex flex-col justify-end">
          <img loading="eager" fetchPriority="high" decoding="async"
            src={event.bannerImage}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#041a13] via-[#06281e]/80 to-black/40" />

          {/* Navigation Bar overlay */}
          <div className="absolute top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-10">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-xs font-bold hover:bg-black/70 border border-white/20 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> All Events
            </Link>

            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  void navigator.share({ title: event.title, url }).catch(() => {});
                  return;
                }
                void navigator.clipboard?.writeText(url).then(() => {
                  setLinkCopied(true);
                  window.setTimeout(() => setLinkCopied(false), 2500);
                });
              }}
              aria-live="polite"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/70 border border-white/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> {linkCopied ? "Link copied" : "Share event"}
            </button>
          </div>

          {/* Title Area */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-24 text-white w-full">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow">
                {event.category}
              </span>
              {event.isMembershipEvent && (
                <span className="px-3 py-1 rounded-full bg-emerald-900/90 text-amber-300 font-extrabold text-xs border border-amber-400/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {schoolInfo.established} — {event.date.slice(0, 4)} · {Number(event.date.slice(0, 4)) - schoolInfo.established} years
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-5xl">
              {event.title}
            </h1>

            {event.subtitle && (
              <p className="text-sm sm:text-base text-amber-200/95 font-medium mt-2 max-w-3xl">
                {event.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-emerald-100 mt-4 pt-4 border-t border-white/15">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300 shrink-0" />
                <strong className="text-white">{event.date}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{event.time}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{event.venue}, {event.locationCity}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Golden Jubilee Countdown Ribbon (If Mega Event) */}
        {isGoldenJubilee && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 py-4 px-4 shadow-lg border-y border-amber-300">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center md:text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 fill-amber-300" />
                </div>
                <div>
                  <div className="font-black text-sm uppercase tracking-wider">
                    Countdown to {event.title}
                  </div>
                  <div className="text-xs text-slate-900 font-medium">
                    {event.subtitle || `${event.venue}${event.locationCity ? `, ${event.locationCity}` : ""}`}
                  </div>
                </div>
              </div>

              {/* Countdown Numbers */}
              <div className="flex items-center gap-2 sm:gap-3 text-center">
                <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl min-w-[55px] shadow-sm">
                  <span className="text-lg sm:text-xl font-black text-amber-300">{timeLeft.days}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400">Days</span>
                </div>
                <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl min-w-[55px] shadow-sm">
                  <span className="text-lg sm:text-xl font-black text-amber-300">{timeLeft.hours}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400">Hours</span>
                </div>
                <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl min-w-[55px] shadow-sm">
                  <span className="text-lg sm:text-xl font-black text-amber-300">{timeLeft.minutes}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400">Mins</span>
                </div>
                <div className="bg-slate-950 text-white px-3 py-1.5 rounded-xl min-w-[55px] shadow-sm">
                  <span className="text-lg sm:text-xl font-black text-amber-300">{timeLeft.seconds}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400">Secs</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column (8 cols): Description, Packages, Schedule, Souvenirs */}
            <div className="lg:col-span-8 space-y-10">
              {/* Event Overview */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xl">
                  <Info className="w-5 h-5 text-emerald-700" />
                  <span>About this event</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>

                {/* Key Highlights list if mega event */}
                {event.highlights && event.highlights.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Event Highlights &amp; Attractions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {event.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs font-bold text-emerald-950"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fees, from the event's own settings */}
              {isPaid && paidGuests.length > 0 && (
                <div className="bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 sm:p-7 rounded-3xl border border-emerald-600/40 shadow-xl space-y-4">
                  <h3 className="text-lg sm:text-xl font-black">Registration fees</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/15">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">Member</span>
                      <div className="text-2xl font-black">{priceLabel}</div>
                    </div>
                    {paidGuests.map((g) => (
                      <div key={g.name} className="bg-white/10 p-4 rounded-2xl border border-white/15">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                          {g.name}
                          {g.max === 1 ? "" : " (each)"}
                        </span>
                        <div className="text-2xl font-black text-amber-300">+{formatTaka(g.price)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delegate Registration Packages (If Mega Event) */}
              {event.packages && event.packages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Delegate Registration Packages
                      </h2>
                      <p className="text-xs text-slate-500">
                        Choose a package when you register.
                      </p>
                    </div>
                    {formatDeadline(event.registrationDeadline) && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full self-start">
                        Deadline: {formatDeadline(event.registrationDeadline)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.packages.map((pkg) => (
                      <div
                        key={pkg.name}
                        className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                          pkg.isPopular
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md relative"
                            : "border-slate-200 shadow-sm hover:border-slate-300"
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-800 to-emerald-700 text-amber-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                            Most Popular Tier
                          </span>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-black text-base text-slate-900">{pkg.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-emerald-800">{pkg.price}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              What&apos;s Included:
                            </span>
                            <ul className="space-y-1.5 text-xs text-slate-700">
                              {pkg.includes.map((inc, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="pt-5 mt-4 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenRsvpWithPackage(pkg.name)}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                              pkg.isPopular
                                ? "bg-emerald-800 hover:bg-emerald-700 text-white"
                                : "bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-800"
                            }`}
                          >
                            <span>Register with this Package</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3-Day Program Schedule / Agenda */}
              {event.agenda && event.agenda.length > 0 && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xl">
                      <ListOrdered className="w-5 h-5 text-emerald-700" />
                      <span>{agendaDays.length > 1 ? `${agendaDays.length}-day schedule` : "Schedule"}</span>
                    </div>

                    {agendaDays.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl" role="tablist" aria-label="Days">
                        {agendaDays.map((day) => (
                          <button
                            key={day}
                            type="button"
                            role="tab"
                            aria-selected={selectedDay === day}
                            onClick={() => setActiveDay(day)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${selectedDay === day ? "bg-emerald-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Agenda Entries */}
                  <div className="divide-y divide-slate-100">
                    {currentDisplayAgenda.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-4 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 text-xs sm:text-sm hover:bg-slate-50/50 p-2 rounded-2xl transition-colors"
                      >
                        <span className="font-extrabold text-emerald-800 sm:w-44 shrink-0 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.time}</span>
                        </span>
                        <span className="text-slate-800 font-medium leading-relaxed">
                          {item.activity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Souvenir, as written by the committee */}
              {event.souvenirDetails && (
                <div className="bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 sm:p-8 rounded-3xl border border-emerald-700 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Gift className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black">Souvenir</h3>
                  </div>
                  <p className="text-sm text-emerald-100/90 leading-relaxed whitespace-pre-line">{event.souvenirDetails}</p>
                </div>
              )}

              {/* Call for souvenir articles (membership event) */}
              {event.isMembershipEvent && (
                <div className="bg-amber-50 border border-amber-200 p-6 sm:p-8 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">
                        স্মৃতিচারণ ও লেখা আহবান: সুবর্ণ জয়ন্তী স্মারকগ্রন্থ &apos;সবুজ পদাবলি&apos;
                      </h4>
                      <p className="text-xs text-slate-600">
                        Call for articles, memoirs, poems and old photos ({schoolInfo.established}–{event.date.slice(0, 4)})
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের গৌরবোজ্জ্বল ৫০ বছর পূর্তি উপলক্ষে প্রকাশনা উপকমিটি স্মারকগ্রন্থের জন্য শিক্ষক-শিক্ষার্থীদের স্মৃতিচারণমূলক লেখা ও ঐতিহাসিক ছবি আহবান করছে।
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-amber-300">
                      Email Articles: {schoolInfo.associationEmail}
                    </span>
                    <span className="text-slate-600">
                      Last Date of Submission: October 31, 2026
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (4 cols): Sticky Registration Card & Contact Hotline */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6 sticky top-24">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Official Registration Status</span>
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {priceLabel}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>
                      <strong className="text-slate-900 font-bold">{event.attendeesCount}</strong> alumni already registered
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-600 rounded-full"
                      style={{ width: `${Math.min((event.attendeesCount / event.maxAttendees) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 block text-right">
                    {event.placesLeft} seats remaining
                  </span>
                </div>

                {/* Primary CTA */}
                <div>
                  {registration ? (
                    <div
                      role="status"
                      className={`w-full py-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 border ${
                        registration.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      {registration.status !== "CANCELLED" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      <span>
                        {registration.status === "PENDING_PAYMENT"
                          ? "Registered — under review"
                          : registration.status === "CANCELLED"
                            ? "Registration cancelled"
                            : "Registered"}
                      </span>
                    </div>
                  ) : !event.isRegistrationOpen ? (
                    <p role="status" className="w-full py-4 rounded-2xl text-xs sm:text-sm font-bold text-center bg-rose-50 text-rose-700 border border-rose-200">
                      {event.closedMessage}
                    </p>
                  ) : (
                    <button
                      onClick={() => handleOpenRsvpWithPackage()}
                      className="w-full py-4 rounded-2xl text-xs sm:text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{event.isMembershipEvent ? "Join & register" : "Register"}</span>
                    </button>
                  )}
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    {isPaid
                      ? "Pay by bKash/Nagad/Bank, then enter your transaction ID — the committee confirms it"
                      : "Free — confirmed instantly"}
                  </p>

                  {registration && (
                    <div className="mt-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs space-y-2">
                      <p className="font-bold text-emerald-900">
                        {registration.status === "PENDING_PAYMENT"
                          ? "Registered — payment and membership under review"
                          : registration.status === "CANCELLED"
                            ? "Your registration was cancelled"
                            : "You're registered"}
                      </p>
                      {registration.ticket && (
                        <img loading="lazy" decoding="async" src={registration.ticket.qrDataUrl} alt="Event ticket QR code" className="w-40 h-40 bg-white rounded-xl border" />
                      )}
                    </div>
                  )}
                </div>

                {/* Metadata List */}
                <div className="pt-4 border-t border-slate-100 space-y-3.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Organizing Body:</span>
                    <span className="font-bold text-slate-900 text-right line-clamp-1">{event.organizer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Capacity:</span>
                    <span className="font-bold text-slate-900">{event.maxAttendees} places</span>
                  </div>
                  {formatDeadline(event.registrationDeadline) && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">Registration Deadline:</span>
                      <span className="font-bold text-amber-700 text-right">{formatDeadline(event.registrationDeadline)}</span>
                    </div>
                  )}
                  {event.guestOfHonor && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">Guests of honour:</span>
                      <span className="font-bold text-slate-900 text-right">{event.guestOfHonor}</span>
                    </div>
                  )}
                </div>

                {/* Questions: the association's real contact */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Questions about this event?</span>
                  </div>
                  <a href={`mailto:${schoolInfo.associationEmail}?subject=${encodeURIComponent(event.title)}`} className="font-bold text-emerald-800 break-all hover:underline">
                    {schoolInfo.associationEmail}
                  </a>
                  <p>
                    or use the <Link href="/contact" className="font-semibold text-emerald-800 underline">contact form</Link>.
                  </p>
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
        initialPackage={selectedPackage}
        onRegistered={(r, createdAccount) => {
          onRegistered(r);
          // A new member stays on the modal's "under review" message; they are not signed in.
          if (!createdAccount) setRsvpOpen(false);
        }}
      />
    </div>
  );
}
