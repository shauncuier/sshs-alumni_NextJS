"use client";

import React, { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RSVPModal from "@/components/events/RSVPModal";
import type { PublicEvent, MemberRegistration } from "@/lib/events/types";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  ArrowLeft,
  Share2,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  Award,
  Music,
  Utensils,
  BookOpen,
  Camera,
  Shirt,
  PhoneCall,
  Info,
  ChevronRight,
  Gift,
  Flame,
  Radio
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = use(params);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [registration, setRegistration] = useState<MemberRegistration | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${slug}`, { cache: "no-store" }).then(async (res) => {
      if (res.status === 404) return setMissing(true);
      setEvent((await res.json()).event);
    });
    fetch(`/api/events/${slug}/rsvp`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { registration: null }))
      .then((body) => setRegistration(body.registration));
  }, [slug]);

  if (missing) notFound();
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
  const [activeDay, setActiveDay] = useState<number>(1);

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

  // Filter agenda by days if Golden Jubilee
  const day1Agenda = event.agenda?.filter((a) => a.time.includes("Day 1")) || [];
  const day2Agenda = event.agenda?.filter((a) => a.time.includes("Day 2")) || [];
  const day3Agenda = event.agenda?.filter((a) => a.time.includes("Day 3")) || [];

  const currentDisplayAgenda =
    isGoldenJubilee && event.agenda
      ? activeDay === 1
        ? day1Agenda
        : activeDay === 2
        ? day2Agenda
        : day3Agenda
      : event.agenda || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Banner Section */}
        <div className="relative min-h-[380px] sm:min-h-[460px] bg-slate-950 overflow-hidden flex flex-col justify-end">
          <img
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
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Event link copied to clipboard!");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-md text-white text-xs font-semibold hover:bg-black/70 border border-white/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Event
            </button>
          </div>

          {/* Title Area */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-24 text-white w-full">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow">
                {event.category}
              </span>
              {isGoldenJubilee && (
                <span className="px-3 py-1 rounded-full bg-emerald-900/90 text-amber-300 font-extrabold text-xs border border-amber-400/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  1974 — 2024 • 50 Years Milestone
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
                    Countdown to the Grand Golden Jubilee
                  </div>
                  <div className="text-xs text-slate-900 font-medium">
                    Gathering 50 batches of alumni across 5 decades in Sitakunda, Chattogram
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
                  <span>Grand Celebration Overview</span>
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

              {/* Official Registration Fee & Rate Structure Card */}
              {isGoldenJubilee && (
                <div className="bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 sm:p-7 rounded-3xl border border-emerald-600/40 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/60 pb-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Official Fee Policy</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Registration Fee Structure (নিবন্ধন ফি কাঠামো)
                      </h3>
                      <p className="text-xs text-emerald-200">
                        Approximate Date: <strong className="text-amber-300">December 30, 2026</strong> • Sabuj Shikshayatan Campus
                      </p>
                    </div>
                    <div className="text-xs bg-white/10 px-3.5 py-2 rounded-2xl border border-white/15 text-emerald-100 self-start sm:self-auto font-medium">
                      Traditional Mezban &amp; Souvenirs Included
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                        Alumnus Delegate
                      </span>
                      <div className="text-2xl font-black text-white">
                        ৳1,000 <span className="text-xs font-semibold text-emerald-200">/ person</span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90 leading-relaxed pt-1">
                        Includes 500-page Hardcover Souvenir Book &apos;সবুজ পদাবলি&apos;, Polo Shirt, Lapel Pin, RFID Pass &amp; Mezban feast.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                        Extra Adult / Spouse
                      </span>
                      <div className="text-2xl font-black text-amber-300">
                        +৳500 <span className="text-xs font-semibold text-emerald-200">each extra</span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90 leading-relaxed pt-1">
                        For accompanying adult guest or spouse. Includes festival access badge, commemorative stole &amp; Mezban grand banquet.
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15 space-y-1">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                        Children (Below 12yr)
                      </span>
                      <div className="text-2xl font-black text-emerald-300">
                        +৳300 <span className="text-xs font-semibold text-emerald-200">below 12 yrs</span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90 leading-relaxed pt-1">
                        For kids under 12. Includes special kids feast meal, commemorative cap, fun zone games &amp; souvenir gift kit.
                      </p>
                    </div>
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
                        Choose your registration tier. Every package includes full festival access and commemorative souvenirs.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full self-start">
                      Deadline: {event.registrationDeadline || "Nov 30, 2026"}
                    </span>
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
                      <span>{isGoldenJubilee ? "3-Day Landmark Festival Schedule" : "Event Schedule & Agenda"}</span>
                    </div>

                    {/* Day selector tabs for Mega Event */}
                    {isGoldenJubilee && (
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                        <button
                          onClick={() => setActiveDay(1)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            activeDay === 1
                              ? "bg-emerald-800 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Day 1 (Dec 30)
                        </button>
                        <button
                          onClick={() => setActiveDay(2)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            activeDay === 2
                              ? "bg-emerald-800 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Day 2 (Dec 31)
                        </button>
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

              {/* Commemorative Souvenir Kit Box */}
              {isGoldenJubilee && (
                <div className="bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 sm:p-8 rounded-3xl border border-emerald-700 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Official Keepsake
                      </span>
                      <h3 className="text-xl font-black">
                        Golden Jubilee Souvenir Delegate Kit
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                    {event.souvenirDetails}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center space-y-1">
                      <BookOpen className="w-5 h-5 mx-auto text-amber-300" />
                      <span className="font-bold block text-white">স্মরণিকা &apos;সবুজ পদাবলি&apos;</span>
                      <span className="text-[10px] text-emerald-200">500-page Hardcover</span>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center space-y-1">
                      <Shirt className="w-5 h-5 mx-auto text-amber-300" />
                      <span className="font-bold block text-white">Gold-Embroidered Polo</span>
                      <span className="text-[10px] text-emerald-200">Custom Size S-XXL</span>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center space-y-1">
                      <Award className="w-5 h-5 mx-auto text-amber-300" />
                      <span className="font-bold block text-white">50th Crest &amp; Pin</span>
                      <span className="text-[10px] text-emerald-200">Laser-Cut Brass</span>
                    </div>

                    <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-center space-y-1">
                      <Utensils className="w-5 h-5 mx-auto text-amber-300" />
                      <span className="font-bold block text-white">Mezban Feast Pass</span>
                      <span className="text-[10px] text-emerald-200">Chittagong Traditional</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Call for Souvenir Articles (Writing / Photos) */}
              {isGoldenJubilee && (
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
                        Call for Articles, Nostalgic Memoirs, Poems &amp; Vintage Photos (1974–2024)
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের গৌরবোজ্জ্বল ৫০ বছর পূর্তি উপলক্ষে প্রকাশনা উপকমিটি স্মারকগ্রন্থের জন্য শিক্ষক-শিক্ষার্থীদের স্মৃতিচারণমূলক লেখা ও ঐতিহাসিক ছবি আহবান করছে।
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                    <span className="text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-amber-300">
                      Email Articles: souvenir@sabujsghs.edu.bd
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
                    {event.registrationFee || "Free for Registered Alumni"}
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
                      <span>Register for Golden Jubilee</span>
                    </button>
                  )}
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Instant confirmation voucher • T-shirt size selection inside
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
                        <img src={registration.ticket.qrDataUrl} alt="Event ticket QR code" className="w-40 h-40 bg-white rounded-xl border" />
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
                    <span className="font-medium">Expected Attendance:</span>
                    <span className="font-bold text-slate-900">{event.maxAttendees}+ Alumni &amp; Families</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Registration Deadline:</span>
                    <span className="font-bold text-amber-700">{event.registrationDeadline || "November 30, 2026"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chief Guests:</span>
                    <span className="font-bold text-slate-900">Distinguished Dignitaries</span>
                  </div>
                </div>

                {/* Hotline & Helpline */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Secretariat Support &amp; Inquiries</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    For accommodation assistance, batch stalls, or expatriate registration inquiries:
                  </p>
                  <div className="font-bold text-emerald-800 text-xs">
                    +880 1819-987654 / +880 1711-000000
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
        initialPackage={selectedPackage}
        onRegistered={(r) => {
          onRegistered(r);
          setRsvpOpen(false);
        }}
      />
    </div>
  );
}
