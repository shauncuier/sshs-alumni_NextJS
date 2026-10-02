"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminRegistration, PublicEvent, PublicPackage, AgendaEntry } from "@/lib/events/types";
import ProofOfStudy from "@/components/admin/ProofOfStudy";
import { formatTaka, dhakaDateInput } from "@/lib/events/pricing";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  Gift,
  BookOpen,
  DollarSign,
  ListOrdered,
  Tag,
  ShieldCheck,
  Search,
  UserCheck,
  Filter,
  Layers,
  ChevronRight,
  Shirt,
  Utensils
} from "lucide-react";

interface AdminEventStudioProps {
  params: Promise<{ id: string }>;
}

export default function AdminEventStudioPage({ params }: AdminEventStudioProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "schedule" | "pricing" | "agenda" | "souvenirs" | "attendees"
  >("overview");

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [attendees, setAttendees] = useState<AdminRegistration[]>([]);
  const [totals, setTotals] = useState({ confirmedRevenue: 0, pendingRevenue: 0, confirmedDonations: 0, headCount: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newPkg, setNewPkg] = useState<PublicPackage>({
    name: "", price: "৳1,000", priceAmount: 1000, description: "", includes: [], isPopular: false, adults: 1, children: 0, guestsFree: false,
  });
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newAgenda, setNewAgenda] = useState<AgendaEntry>({ time: "Day 1 - 09:00 AM", activity: "" });
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const load = async () => {
    const res = await fetch(`/api/admin/events/${resolvedParams.id}`, { cache: "no-store" });
    const body = await res.json();
    if (res.status === 404) return router.push("/admin/events");
    if (!res.ok) return showToast(body.error || "Could not load the event.");
    setEvent(body.event);
    setAttendees(body.registrations);
    setTotals(body.totals);
  };

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Event Management Studio...
      </div>
    );
  }

  /** Saves the given fields (or the whole editable event) through the API. */
  const save = async (changes: Partial<PublicEvent> & Record<string, unknown>, message: string) => {
    const merged = { ...event, ...changes };
    // Send the deadline only when the admin edited it (cleared, or picked a bare date);
    // an unchanged value from the server is a full timestamp that a bare date would shift.
    const deadline = merged.registrationDeadline ?? undefined;
    const deadlineChange: { registrationDeadline?: string | null } =
      deadline === ""
        ? { registrationDeadline: null }
        : deadline !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(deadline)
          ? { registrationDeadline: deadline }
          : {};
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: merged.title, subtitle: merged.subtitle, category: merged.category, date: merged.date, time: merged.time,
        venue: merged.venue, locationCity: merged.locationCity, organizer: merged.organizer, bannerImage: merged.bannerImage,
        description: merged.description, maxAttendees: merged.maxAttendees, isRegistrationOpen: merged.registrationEnabled,
        ...deadlineChange,
        guestOfHonor: merged.guestOfHonor, souvenirDetails: merged.souvenirDetails,
        isMegaEvent: merged.isMegaEvent, isMembershipEvent: merged.isMembershipEvent, registrationFee: merged.registrationFeeAmount,
        extraAdultFee: merged.extraAdultFee, childFee: merged.childFee, paymentInstructions: merged.paymentInstructions,
        highlights: merged.highlights, agenda: merged.agenda,
        packages: merged.packages.map((p) => ({ ...p, price: p.priceAmount })),
      }),
    });
    const body = await res.json();
    if (!res.ok) return showToast(body.error || "Could not save.");
    setEvent(body.event);
    showToast(message);
  };

  const handleSaveAll = () => save({}, `All updates for "${event.title}" saved.`);

  const handleAddPackage = () => {
    if (!newPkg.name.trim()) return;
    const priceAmount = Number(String(newPkg.price).replace(/[^\d.]/g, "")) || 0;
    save({ packages: [...event.packages, { ...newPkg, priceAmount, price: formatTaka(priceAmount) }] }, `Package "${newPkg.name}" added.`);
    setIsAddingPackage(false);
    setNewPkg({ name: "", price: "৳1,000", priceAmount: 1000, description: "", includes: [], isPopular: false, adults: 1, children: 0, guestsFree: false });
  };

  const handleDeletePackage = (pkgName: string) =>
    save({ packages: event.packages.filter((p) => p.name !== pkgName) }, `Package "${pkgName}" removed.`);

  const handleAddAgenda = () => {
    if (!newAgenda.activity.trim()) return;
    save({ agenda: [...(event.agenda ?? []), newAgenda] }, "Agenda session added.");
    setIsAddingAgenda(false);
    setNewAgenda({ time: "Day 1 - 09:00 AM", activity: "" });
  };

  const handleDeleteAgenda = (idx: number) =>
    save({ agenda: (event.agenda ?? []).filter((_, i) => i !== idx) }, "Agenda session removed.");

  const decide = async (a: AdminRegistration, action: "APPROVE" | "CANCEL" | "CHECK_IN" | "UNDO_CHECK_IN") => {
    setBusyId(a.id);
    const res = await fetch(`/api/admin/events/${event.id}/registrations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    setBusyId(null);
    if (!res.ok) return showToast(body.error || "Could not update the registration.");
    showToast(`${a.name}: ${body.registration.status.replace("_", " ").toLowerCase()}`);
    load();
  };

  const handleExportCSV = () => {
    const header = "Name,Batch,Roll,Section,Email,Phone,Package,Head_Count,Fee_BDT,Donation_BDT,Payment_Method,Trx_ID,Status,Membership,Registered_At\n";
    const rows = attendees
      .map((a) => [a.name, a.batch ?? "", a.rollNumber ?? "", a.section ?? "", a.email, a.phone, a.packageName ?? "", a.headCount, a.totalFee, a.donationAmount, a.paymentMethod ?? "", a.transactionId ?? "", a.status, a.membershipStatus, a.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}_Registrations.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredAttendees = attendees.filter((a) => {
    if (attendeeStatusFilter !== "ALL" && a.status !== attendeeStatusFilter) return false;
    const q = attendeeSearch.trim().toLowerCase();
    return !q || [a.name, a.email, a.phone, String(a.batch ?? ""), a.transactionId ?? ""].some((v) => v.toLowerCase().includes(q));
  });
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Link
              href="/admin/events"
              className="hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Events Manager
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">Studio Console</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {event.title}
            </h1>
            {event.isMegaEvent && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" /> 50-Year Landmark
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Comprehensive control panel to configure every parameter, package tier, multi-day schedule, and attendee rosters.
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Link
            href={`/events/${event.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors"
            title="Open Live Public Event Page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview Live</span>
          </Link>

          <button
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {[
          { key: "overview", label: "1. Core & Media", icon: Layers },
          { key: "schedule", label: "2. Schedule & Venue", icon: Calendar },
          { key: "pricing", label: "3. Pricing & Packages", icon: DollarSign },
          { key: "agenda", label: "4. Multi-Day Agenda", icon: ListOrdered },
          { key: "souvenirs", label: "5. Souvenirs & Editorial", icon: Gift },
          { key: "attendees", label: `6. Attendees & Check-In (${attendees.length})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#06281e] text-amber-300 shadow-md border border-emerald-700"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-slate-500"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CORE & MEDIA */}
      {activeTab === "overview" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Event Overview &amp; Public Metadata</h3>
              <p className="text-xs text-slate-500">Configure title, subtitle, categories, and public visibility flags.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">ID: {event.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Official Event Title *</label>
              <input
                type="text"
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Bangla Title / Subtitle / Theme *</label>
              <input
                type="text"
                value={event.subtitle || ""}
                onChange={(e) => setEvent({ ...event, subtitle: e.target.value })}
                placeholder="e.g. Half a Century of Knowledge, Legacy & Brotherhood (1974 - 2024)"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Category</label>
              <select
                value={event.category}
                onChange={(e) => setEvent({ ...event, category: e.target.value as PublicEvent["category"] })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="REUNION">REUNION</option>
                <option value="SPORTS">SPORTS</option>
                <option value="WEBINAR">WEBINAR</option>
                <option value="CULTURAL">CULTURAL</option>
                <option value="COMMUNITY">COMMUNITY</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Organizing Committee</label>
              <input
                type="text"
                value={event.organizer}
                onChange={(e) => setEvent({ ...event, organizer: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Chief Guests &amp; Dignitaries</label>
              <input
                type="text"
                value={event.guestOfHonor || ""}
                onChange={(e) => setEvent({ ...event, guestOfHonor: e.target.value })}
                placeholder="e.g. Distinguished Veterans, Emeritus Headmasters & Cabinet Dignitaries"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Banner Image URL / Local Asset</label>
              <input
                type="text"
                value={event.bannerImage}
                onChange={(e) => setEvent({ ...event, bannerImage: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Banner Preview */}
            <div className="md:col-span-2 space-y-1">
              <label className="font-bold text-slate-700 block">Banner Preview</label>
              <div className="h-44 w-full rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-900">
                <img
                  src={event.bannerImage}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <span className="text-white text-xs font-bold">
                    {event.title} • {event.subtitle}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-slate-700">Event Overview &amp; Description *</label>
              <textarea
                rows={5}
                value={event.description}
                onChange={(e) => setEvent({ ...event, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Flags */}
            <div className="md:col-span-2 flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={event.isMegaEvent ?? false}
                  onChange={(e) => setEvent({ ...event, isMegaEvent: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Enable Golden Jubilee / Landmark Mega-Event Design Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={event.registrationEnabled}
                  onChange={(e) => setEvent({ ...event, registrationEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Allow Online Public Registrations &amp; RSVPs</span>
                {event.closedMessage && <span className="text-[11px] font-semibold text-amber-700">Currently closed: {event.closedMessage}</span>}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE & VENUE */}
      {activeTab === "schedule" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Dates, Timing &amp; Campus Location</h3>
            <p className="text-xs text-slate-500">Configure event date, countdown target, capacity limits, and venue logistics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Target Date (YYYY-MM-DD) *</label>
              <input
                type="date"
                value={event.date}
                onChange={(e) => setEvent({ ...event, date: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Public Timing / Duration Label *</label>
              <input
                type="text"
                value={event.time}
                onChange={(e) => setEvent({ ...event, time: e.target.value })}
                placeholder="e.g. Grand Landmark Festival (Approx. Date: December 30, 2026)"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Venue &amp; Grounds *</label>
              <input
                type="text"
                value={event.venue}
                onChange={(e) => setEvent({ ...event, venue: e.target.value })}
                placeholder="e.g. Main Campus Grounds & Central Convention Center"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Location City *</label>
              <input
                type="text"
                value={event.locationCity}
                onChange={(e) => setEvent({ ...event, locationCity: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Max Capacity (Seats / Delegate Badges)</label>
              <input
                type="number"
                min="1"
                value={event.maxAttendees}
                onChange={(e) => setEvent({ ...event, maxAttendees: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Registration Deadline</label>
              <input
                type="date"
                value={dhakaDateInput(event.registrationDeadline)}
                onChange={(e) => setEvent({ ...event, registrationDeadline: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING & REGISTRATION PACKAGES */}
      {activeTab === "pricing" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registration Fee Policy &amp; Delegate Packages</h3>
              <p className="text-xs text-slate-500">
                Set per-person fees, family guest rates, and customize tiered packages for alumni delegates.
              </p>
            </div>

            <button
              onClick={() => setIsAddingPackage(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Package Tier
            </button>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs">
            <label className="font-bold text-emerald-950 block">
              Registration fee per person, in ৳ (0 = free)
              <input
                type="number"
                min={0}
                value={event.registrationFeeAmount}
                onChange={(e) => setEvent({ ...event, registrationFeeAmount: Number(e.target.value) || 0 })}
                className="mt-1 w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </label>
            <p className="text-[11px] text-emerald-700">Used when the event has no packages; the public fee text is generated from it.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <label className="font-bold text-slate-700">
              Extra adult fee (৳)
              <input type="number" min={0} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" value={event.extraAdultFee}
                onChange={(e) => setEvent({ ...event, extraAdultFee: Number(e.target.value) || 0 })} />
            </label>
            <label className="font-bold text-slate-700">
              Child fee, under 12 (৳)
              <input type="number" min={0} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl" value={event.childFee}
                onChange={(e) => setEvent({ ...event, childFee: Number(e.target.value) || 0 })} />
            </label>
            <label className="font-bold text-slate-700 flex items-center gap-2 sm:mt-5">
              <input type="checkbox" checked={event.isMembershipEvent}
                onChange={(e) => setEvent({ ...event, isMembershipEvent: e.target.checked })} />
              Membership event (joining = this registration)
            </label>
            <label className="sm:col-span-3 font-bold text-slate-700">
              Payment instructions (shown to registrants; required for paid events)
              <textarea rows={2} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl font-normal"
                placeholder="Send to bKash 01XXXXXXXXX (Merchant), then enter your TrxID"
                value={event.paymentInstructions ?? ""} onChange={(e) => setEvent({ ...event, paymentInstructions: e.target.value })} />
            </label>
          </div>

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(event.packages || []).map((pkg, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4 relative"
              >
                {pkg.isPopular && (
                  <span className="absolute -top-2.5 right-4 bg-emerald-800 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                    Most Popular
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{pkg.name}</h4>
                      <span className="text-xl font-black text-emerald-800">{pkg.price}</span>
                    </div>

                    <button
                      onClick={() => handleDeletePackage(pkg.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{pkg.description}</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    {pkg.adults} adult{pkg.adults === 1 ? "" : "s"}{pkg.children > 0 ? ` + ${pkg.children} child${pkg.children === 1 ? "" : "ren"}` : ""}{pkg.guestsFree ? " · extra guests free" : ""}
                  </p>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Inclusions:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {pkg.includes.map((inc, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal / Form for adding package */}
          {isAddingPackage && (
            <div className="p-5 border-2 border-dashed border-emerald-400 bg-emerald-50/30 rounded-3xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-emerald-950">Add New Delegate Package Tier</h4>
                <button
                  onClick={() => setIsAddingPackage(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Package Name *</label>
                  <input
                    type="text"
                    value={newPkg.name}
                    onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })}
                    placeholder="e.g. VIP Patron Sponsor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (৳) *</label>
                  <input
                    type="text"
                    value={newPkg.price}
                    onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })}
                    placeholder="e.g. ৳5,000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <label className="font-bold text-slate-700">Adults incl.
                    <input type="number" min={1} className="w-full px-3 py-2 border border-slate-300 rounded-xl" value={newPkg.adults}
                      onChange={(e) => setNewPkg({ ...newPkg, adults: Math.max(1, Number(e.target.value) || 1) })} />
                  </label>
                  <label className="font-bold text-slate-700">Children incl.
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-300 rounded-xl" value={newPkg.children}
                      onChange={(e) => setNewPkg({ ...newPkg, children: Math.max(0, Number(e.target.value) || 0) })} />
                  </label>
                  <label className="font-bold text-slate-700 flex items-center gap-1 mt-5">
                    <input type="checkbox" checked={newPkg.guestsFree} onChange={(e) => setNewPkg({ ...newPkg, guestsFree: e.target.checked })} />
                    Extra guests free
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={newPkg.description}
                  onChange={(e) => setNewPkg({ ...newPkg, description: e.target.value })}
                  placeholder="Summary of this registration tier..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Inclusions (comma separated)
                </label>
                <input
                  type="text"
                  value={newPkg.includes.join(", ")}
                  onChange={(e) =>
                    setNewPkg({
                      ...newPkg,
                      includes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. VIP Seating, Souvenir Book, Polo Shirt, Mezban Pass"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newPkg.isPopular}
                    onChange={(e) => setNewPkg({ ...newPkg, isPopular: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Mark as &apos;Most Popular&apos; Tier</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPackage(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPackage}
                    className="px-4 py-1.5 bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Add Tier
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MULTI-DAY AGENDA */}
      {activeTab === "agenda" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Program Agenda &amp; Multi-Day Timeline</h3>
              <p className="text-xs text-slate-500">
                Organize sessions, marches, teacher felicitations, banquets, and concerts across festival days.
              </p>
            </div>

            <button
              onClick={() => setIsAddingAgenda(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Agenda Session
            </button>
          </div>

          {/* Add Agenda Slot Form */}
          {isAddingAgenda && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-300 rounded-2xl space-y-3 text-xs">
              <h4 className="font-bold text-emerald-950">Add Program Timeline Session</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time &amp; Day Label</label>
                  <input
                    type="text"
                    value={newAgenda.time}
                    onChange={(e) => setNewAgenda({ ...newAgenda, time: e.target.value })}
                    placeholder="e.g. Day 1 (Dec 30) - 10:00 AM"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Activity / Ceremony Description</label>
                  <input
                    type="text"
                    value={newAgenda.activity}
                    onChange={(e) => setNewAgenda({ ...newAgenda, activity: e.target.value })}
                    placeholder="e.g. National Anthem, School Song & 50th Year Golden Flag Hoisting"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingAgenda(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAgenda}
                  className="px-4 py-1.5 bg-emerald-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Session
                </button>
              </div>
            </div>
          )}

          {/* Agenda List */}
          <div className="divide-y divide-slate-100 text-xs">
            {(event.agenda || []).map((item, idx) => (
              <div
                key={idx}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-extrabold text-emerald-900 block">{item.time}</span>
                    <span className="text-slate-800 font-medium">{item.activity}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteAgenda(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg self-end sm:self-center cursor-pointer transition-colors"
                  title="Remove Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SOUVENIRS & EDITORIAL CALL */}
      {activeTab === "souvenirs" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Souvenir Delegate Kit &amp; Article Call</h3>
            <p className="text-xs text-slate-500">
              Manage souvenir package descriptions, keepsake deliverable items, and commemorative book article submission requirements.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Souvenir Kit Package Description</label>
              <textarea
                rows={3}
                value={event.souvenirDetails || ""}
                onChange={(e) => setEvent({ ...event, souvenirDetails: e.target.value })}
                placeholder="Every registered delegate receives a luxury commemorative bag containing..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="font-bold text-slate-700 block">Highlights Badges (One per line)</label>
              <textarea
                rows={5}
                value={(event.highlights || []).join("\n")}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    highlights: e.target.value.split("\n").filter((l) => l.trim().length > 0),
                  })
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ATTENDEES ROSTER & DOOR CHECK-IN */}
      {activeTab === "attendees" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registered Delegates &amp; Door Check-In Roster</h3>
              <p className="text-xs text-slate-500">
                Approve payments, mark door attendance and export the roster. Every registration belongs to a member account.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Download className="w-4 h-4" /> Export Roster (CSV)
              </button>
            </div>
          </div>

          {/* Real-time KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Head count</span>
              <strong className="text-xl font-black text-slate-900 block my-1">{totals.headCount} people</strong>
              <span className="text-[11px] text-slate-500">Capacity: {event.maxAttendees}</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Confirmed revenue</span>
              <strong className="text-xl font-black text-emerald-900 block my-1">{formatTaka(totals.confirmedRevenue)}</strong>
              <span className="text-[11px] text-emerald-700">incl. {formatTaka(totals.confirmedDonations)} donations</span>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Pending payment</span>
              <strong className="text-xl font-black text-blue-900 block my-1">{formatTaka(totals.pendingRevenue)}</strong>
              <span className="text-[11px] text-blue-700">awaiting approval</span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Door checked-in</span>
              <strong className="text-xl font-black text-amber-900 block my-1">{checkedInCount} / {attendees.length}</strong>
              <span className="text-[11px] text-amber-700">
                {attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0}% gate attendance
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                placeholder="Search attendee by name, batch, phone, TrxID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "CANCELLED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setAttendeeStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    attendeeStatusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Attendees Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">Attendee</th>
                  <th className="p-3.5">Batch &amp; membership</th>
                  <th className="p-3.5">Package</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No attendees found matching filter.</td>
                  </tr>
                )}
                {filteredAttendees.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 text-xs">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img src={a.avatarUrl || "/logo.png"} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">{a.name}</div>
                          <div className="text-slate-500">{a.email} · {a.phone}</div>
                          {a.avatarUrl?.startsWith("/api/media/avatars/") && (
                            <a href={a.avatarUrl.replace("avatar.webp", "original.jpg")} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline">View print photo</a>
                          )}
                          {a.notes && a.notes.includes("[Volunteer:") && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300/80">
                                🤝 {a.notes.replace("[Volunteer:", "Volunteer:").replace("]", " —")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      SSC {a.batch ?? "—"}{a.rollNumber ? ` · Roll ${a.rollNumber}` : ""}{a.section ? ` · ${a.section}` : ""}
                      <div className={a.membershipStatus === "VERIFIED" ? "text-emerald-700" : a.membershipStatus === "REJECTED" ? "text-rose-700" : "text-amber-700"}>
                        Membership: {a.membershipStatus.toLowerCase()}
                      </div>
                      {event.isMembershipEvent && <ProofOfStudy proof={a.proof} />}
                    </td>
                    <td className="py-3 px-3">{a.packageName ?? "—"} · {a.headCount} {a.headCount === 1 ? "person" : "people"}</td>
                    <td className="py-3 px-3">
                      {formatTaka(a.totalFee)}{a.donationAmount > 0 && <> + {formatTaka(a.donationAmount)} donation</>}
                      <div className="text-slate-500 font-mono">{a.paymentMethod ?? "—"} {a.transactionId ?? ""}</div>
                    </td>
                    <td className="py-3 px-3 font-bold">{a.status.replace("_", " ")}</td>
                    <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                      {a.status === "PENDING_PAYMENT" && (
                        <button disabled={busyId === a.id} onClick={() => decide(a, "APPROVE")} className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white font-bold disabled:opacity-50">
                          {event.isMembershipEvent ? "Approve (payment + membership)" : "Confirm payment"}
                        </button>
                      )}
                      {a.status === "CONFIRMED" && (
                        <button disabled={busyId === a.id} onClick={() => decide(a, "CHECK_IN")} className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold disabled:opacity-50">Check in</button>
                      )}
                      {a.status === "CHECKED_IN" && (
                        <button disabled={busyId === a.id} onClick={() => decide(a, "UNDO_CHECK_IN")} className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold disabled:opacity-50">Undo check-in</button>
                      )}
                      {(a.status === "PENDING_PAYMENT" || a.status === "CONFIRMED") && (
                        <button disabled={busyId === a.id} onClick={() => decide(a, "CANCEL")} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold disabled:opacity-50">
                          {a.status === "PENDING_PAYMENT" && event.isMembershipEvent ? "Reject" : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
