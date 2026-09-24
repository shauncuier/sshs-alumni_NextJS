"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EventItem,
  sampleEvents,
} from "@/lib/data";
import {
  getStoredEvents,
  getStoredEventById,
  saveStoredEvent,
  deleteStoredEvent,
  getStoredAttendees,
  saveStoredAttendee,
  updateAttendeeStatus,
  deleteStoredAttendee,
  EventAttendee,
  EventPackage,
  AgendaItem,
} from "@/lib/events-service";
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

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Attendees Search & Filters
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState("ALL");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // New package modal state
  const [newPkg, setNewPkg] = useState<EventPackage>({
    name: "",
    price: "৳1,000",
    description: "",
    includes: ["Festival Access Pass", "Souvenir Delegate Kit", "Banquet Feast Pass"],
    isPopular: false,
  });
  const [isAddingPackage, setIsAddingPackage] = useState(false);

  // New agenda slot state
  const [newAgenda, setNewAgenda] = useState<AgendaItem>({
    time: "Day 1 - 09:00 AM",
    activity: "",
  });
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);

  // Manual attendee registration form state
  const [manualAttendee, setManualAttendee] = useState({
    name: "",
    batch: "2010",
    email: "",
    phone: "",
    packageName: "General Alumnus Delegate",
    extraAdults: 0,
    childrenBelow12: 0,
    tshirtSize: "L" as const,
    mealChoice: "Traditional Mezban Beef" as const,
    paymentMethod: "Secretariat Cash" as const,
    trxId: `CASH-${Date.now().toString().slice(-5)}`,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    const loadedEvent = getStoredEventById(resolvedParams.id) || sampleEvents.find(e => e.id === resolvedParams.id);
    if (loadedEvent) {
      setEvent(loadedEvent);
      setAttendees(getStoredAttendees(loadedEvent.id));
    } else {
      setEvent(sampleEvents[0]);
      setAttendees(getStoredAttendees(sampleEvents[0].id));
    }
  }, [resolvedParams.id]);

  if (!event) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Event Management Studio...
      </div>
    );
  }

  // Save full event changes
  const handleSaveAll = () => {
    if (!event) return;
    saveStoredEvent(event);
    showToast(`All updates for "${event.title}" saved successfully!`);
  };

  // Add Package
  const handleAddPackage = () => {
    if (!newPkg.name.trim()) return;
    const updatedPackages = [...(event.packages || []), newPkg];
    const updatedEvent = { ...event, packages: updatedPackages };
    setEvent(updatedEvent);
    saveStoredEvent(updatedEvent);
    setIsAddingPackage(false);
    setNewPkg({
      name: "",
      price: "৳1,000",
      description: "",
      includes: ["Festival Access Pass", "Souvenir Delegate Kit", "Banquet Feast Pass"],
      isPopular: false,
    });
    showToast(`Package "${newPkg.name}" added!`);
  };

  // Delete Package
  const handleDeletePackage = (pkgName: string) => {
    const updatedPackages = (event.packages || []).filter((p) => p.name !== pkgName);
    const updatedEvent = { ...event, packages: updatedPackages };
    setEvent(updatedEvent);
    saveStoredEvent(updatedEvent);
    showToast(`Package "${pkgName}" removed.`);
  };

  // Add Agenda Item
  const handleAddAgenda = () => {
    if (!newAgenda.activity.trim()) return;
    const updatedAgenda = [...(event.agenda || []), newAgenda];
    const updatedEvent = { ...event, agenda: updatedAgenda };
    setEvent(updatedEvent);
    saveStoredEvent(updatedEvent);
    setIsAddingAgenda(false);
    setNewAgenda({ time: "Day 1 - 09:00 AM", activity: "" });
    showToast("New agenda session added!");
  };

  // Delete Agenda Item
  const handleDeleteAgenda = (idx: number) => {
    const updatedAgenda = (event.agenda || []).filter((_, i) => i !== idx);
    const updatedEvent = { ...event, agenda: updatedAgenda };
    setEvent(updatedEvent);
    saveStoredEvent(updatedEvent);
    showToast("Agenda session removed.");
  };

  // Check in attendee
  const handleToggleCheckIn = (attendee: EventAttendee) => {
    const newStatus = attendee.status === "CHECKED_IN" ? "CONFIRMED" : "CHECKED_IN";
    const updated = updateAttendeeStatus(attendee.id, newStatus);
    setAttendees(updated.filter((a) => a.eventId === event.id));
    showToast(`${attendee.name} marked as ${newStatus === "CHECKED_IN" ? "Checked In ✓" : "Confirmed"}`);
  };

  // Manual attendee registration submit
  const handleManualAttendeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fee =
      1000 +
      Number(manualAttendee.extraAdults) * 500 +
      Number(manualAttendee.childrenBelow12) * 300;

    const newRecord: EventAttendee = {
      id: `att-${Date.now().toString().slice(-6)}`,
      eventId: event.id,
      name: manualAttendee.name,
      batch: manualAttendee.batch,
      email: manualAttendee.email || "secretariat.desk@example.com",
      phone: manualAttendee.phone,
      packageName: manualAttendee.packageName,
      extraAdults: Number(manualAttendee.extraAdults),
      childrenBelow12: Number(manualAttendee.childrenBelow12),
      totalFee: fee,
      tshirtSize: manualAttendee.tshirtSize,
      mealChoice: manualAttendee.mealChoice,
      paymentMethod: manualAttendee.paymentMethod,
      trxId: manualAttendee.trxId,
      status: "CONFIRMED",
      registeredAt: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    const updated = saveStoredAttendee(newRecord);
    setAttendees(updated.filter((a) => a.eventId === event.id));

    // Update event attendee count
    const updatedEvent = { ...event, attendeesCount: (event.attendeesCount || 0) + 1 };
    setEvent(updatedEvent);
    saveStoredEvent(updatedEvent);

    setIsManualModalOpen(false);
    showToast(`Attendee ${manualAttendee.name} registered successfully!`);
  };

  // Export Attendees CSV
  const handleExportCSV = () => {
    const header = "Ticket_ID,Name,Batch,Email,Phone,Package,Extra_Adults,Children,Total_Fee_BDT,TShirt,Meal_Choice,Payment_Method,Trx_ID,Status,Registered_At\n";
    const rows = attendees
      .map(
        (a) =>
          `"${a.id}","${a.name}","${a.batch}","${a.email}","${a.phone}","${a.packageName}",${a.extraAdults},${a.childrenBelow12},${a.totalFee},"${a.tshirtSize}","${a.mealChoice}","${a.paymentMethod}","${a.trxId || "N/A"}","${a.status}","${a.registeredAt}"`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}_Complete_Roster.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported complete attendee roster to CSV!");
  };

  // Filter attendees
  const filteredAttendees = attendees.filter((a) => {
    if (attendeeStatusFilter !== "ALL" && a.status !== attendeeStatusFilter) return false;
    if (attendeeSearch.trim()) {
      const q = attendeeSearch.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.batch.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.trxId && a.trxId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate Attendance KPIs
  const totalRevenue = attendees.reduce((sum, a) => sum + (a.totalFee || 0), 0);
  const checkedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const beefCount = attendees.filter((a) => a.mealChoice?.includes("Beef")).length;
  const chickenCount = attendees.filter((a) => a.mealChoice?.includes("Chicken")).length;
  const vegCount = attendees.filter((a) => a.mealChoice?.includes("Vegetarian")).length;

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
            href={`/events/${event.id}`}
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
              onClick={() => setActiveTab(tab.key as any)}
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
                onChange={(e) => setEvent({ ...event, category: e.target.value as any })}
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
                  checked={event.isRegistrationOpen}
                  onChange={(e) => setEvent({ ...event, isRegistrationOpen: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <span>Allow Online Public Registrations &amp; RSVPs</span>
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
                type="text"
                value={event.registrationDeadline || ""}
                onChange={(e) => setEvent({ ...event, registrationDeadline: e.target.value })}
                placeholder="e.g. December 15, 2026"
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

          {/* Quick Rate Card Policy input */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs">
            <span className="font-bold text-emerald-950 block">Registration Fee Summary String</span>
            <input
              type="text"
              value={event.registrationFee || ""}
              onChange={(e) => setEvent({ ...event, registrationFee: e.target.value })}
              placeholder="e.g. ৳1,000 / Person (৳500 each extra adult, ৳300 below 12 yrs)"
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-900 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            <p className="text-[11px] text-emerald-700">
              This summary is displayed prominently on banners, event cards, and ticket receipts.
            </p>
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
                Track real-time registrations, mark door attendance, inspect banquet meal counts, and add offline delegates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Register Attendee Manually
              </button>

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
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Registered</span>
              <strong className="text-xl font-black text-slate-900 block my-1">
                {attendees.length} Delegates
              </strong>
              <span className="text-[11px] text-slate-500">Capacity: {event.maxAttendees}</span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Revenue Collected</span>
              <strong className="text-xl font-black text-emerald-900 block my-1">
                ৳{totalRevenue.toLocaleString()}
              </strong>
              <span className="text-[11px] text-emerald-700">From fees &amp; sponsors</span>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Door Checked-In</span>
              <strong className="text-xl font-black text-amber-900 block my-1">
                {checkedInCount} / {attendees.length}
              </strong>
              <span className="text-[11px] text-amber-700">
                {attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0}% gate attendance
              </span>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Mezban Meal Counts</span>
              <div className="text-[11px] text-slate-700 space-y-0.5 mt-1">
                <span className="block font-bold">Beef: {beefCount}</span>
                <span className="block">Chicken: {chickenCount} | Veg: {vegCount}</span>
              </div>
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
              {["ALL", "CONFIRMED", "CHECKED_IN", "PENDING"].map((status) => (
                <button
                  key={status}
                  onClick={() => setAttendeeStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    attendeeStatusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Attendees Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">Delegate Name &amp; Contact</th>
                  <th className="p-3.5">Batch</th>
                  <th className="p-3.5">Package &amp; Guests</th>
                  <th className="p-3.5">Polo / Meal</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Gate Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No attendees found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <strong className="text-slate-900 font-bold block">{att.name}</strong>
                        <span className="text-[11px] text-slate-500 block">{att.phone}</span>
                        <span className="text-[10px] text-slate-400 block">{att.email}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                          {att.batch}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 block">{att.packageName}</span>
                        <span className="text-[11px] text-slate-500">
                          {att.extraAdults > 0 && `+${att.extraAdults} Adult `}
                          {att.childrenBelow12 > 0 && `+${att.childrenBelow12} Child`}
                          {att.extraAdults === 0 && att.childrenBelow12 === 0 && "Individual Alumnus"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-700 block">Size {att.tshirtSize}</span>
                        <span className="text-[11px] text-emerald-800">{att.mealChoice}</span>
                      </td>
                      <td className="p-3.5">
                        <strong className="text-emerald-900 font-black block">৳{att.totalFee}</strong>
                        <span className="text-[10px] text-slate-500 block">
                          {att.paymentMethod} • {att.trxId || "Direct"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            att.status === "CHECKED_IN"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {att.status === "CHECKED_IN" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Checked In</span>
                            </>
                          ) : (
                            <span>Confirmed</span>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleToggleCheckIn(att)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            att.status === "CHECKED_IN"
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs"
                          }`}
                        >
                          {att.status === "CHECKED_IN" ? "Undo Check-In" : "Door Check-In"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Registration Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Secretariat &amp; Offline Desk
                </span>
                <h3 className="text-base font-bold">Register Walk-in Attendee Manually</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAttendeeSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={manualAttendee.name}
                    onChange={(e) => setManualAttendee({ ...manualAttendee, name: e.target.value })}
                    placeholder="e.g. Md. Shahidul Islam"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SSC Batch Year *</label>
                  <input
                    type="text"
                    required
                    value={manualAttendee.batch}
                    onChange={(e) => setManualAttendee({ ...manualAttendee, batch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={manualAttendee.phone}
                    onChange={(e) => setManualAttendee({ ...manualAttendee, phone: e.target.value })}
                    placeholder="+880 1819-..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={manualAttendee.email}
                    onChange={(e) => setManualAttendee({ ...manualAttendee, email: e.target.value })}
                    placeholder="optional@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Extra Adults (+৳500 each)</label>
                  <input
                    type="number"
                    min="0"
                    value={manualAttendee.extraAdults}
                    onChange={(e) =>
                      setManualAttendee({ ...manualAttendee, extraAdults: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Children &lt;12yr (+৳300 each)</label>
                  <input
                    type="number"
                    min="0"
                    value={manualAttendee.childrenBelow12}
                    onChange={(e) =>
                      setManualAttendee({ ...manualAttendee, childrenBelow12: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Polo T-Shirt Size</label>
                  <select
                    value={manualAttendee.tshirtSize}
                    onChange={(e) =>
                      setManualAttendee({ ...manualAttendee, tshirtSize: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mezban Meal Choice</label>
                  <select
                    value={manualAttendee.mealChoice}
                    onChange={(e) =>
                      setManualAttendee({ ...manualAttendee, mealChoice: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Traditional Mezban Beef">Traditional Mezban Beef</option>
                    <option value="Special Chicken Roast">Special Chicken Roast</option>
                    <option value="Vegetarian Delight">Vegetarian Delight</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Registration Fee:</span>
                <span className="text-base font-black text-emerald-900">
                  ৳{(1000 + manualAttendee.extraAdults * 500 + manualAttendee.childrenBelow12 * 300).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
