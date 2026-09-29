"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { EventItem } from "@/lib/data";
import { dhakaDateInput } from "@/lib/events/pricing";
import type { AdminRegistration, PublicEvent } from "@/lib/events/types";
import {
  Calendar,
  Plus,
  Users,
  MapPin,
  Edit,
  Trash2,
  X,
  Check,
  Search,
  Download,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Clock,
  Tag,
  Layers,
  BarChart3
} from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const load = () =>
    fetch("/api/admin/events", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setEvents(body.events);
      })
      .catch((err: Error) => showToast(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Form State
  const initialFormState: {
    id: string;
    title: string;
    subtitle: string;
    category: EventItem["category"];
    date: string;
    time: string;
    venue: string;
    locationCity: string;
    organizer: string;
    registrationFee: number;
    registrationDeadline: string;
    maxAttendees: number;
    registrationEnabled: boolean;
    description: string;
    bannerImage: string;
  } = {
    id: "",
    title: "",
    subtitle: "",
    category: "REUNION",
    date: new Date().toISOString().split("T")[0],
    time: "09:00 AM - 05:00 PM",
    venue: "Main Campus Grounds, Sitakunda",
    locationCity: "Chattogram",
    organizer: "SSGHS Alumni Association",
    registrationFee: 0,
    registrationDeadline: "",
    maxAttendees: 1000,
    registrationEnabled: true,
    description: "",
    bannerImage: "/golden-jubilee.jpg",
  };

  const [formData, setFormData] = useState(initialFormState);

  // Open Edit Modal
  const handleEditClick = (event: PublicEvent) => {
    setEditingEvent(event);
    setFormData({
      id: event.id,
      title: event.title,
      subtitle: event.subtitle || "",
      category: event.category,
      date: event.date,
      time: event.time,
      venue: event.venue,
      locationCity: event.locationCity,
      organizer: event.organizer,
      registrationFee: event.registrationFeeAmount,
      registrationDeadline: dhakaDateInput(event.registrationDeadline),
      maxAttendees: event.maxAttendees,
      registrationEnabled: event.registrationEnabled,
      description: event.description,
      bannerImage: event.bannerImage,
    });
    setIsModalOpen(true);
  };

  // Open Create Modal
  const handleCreateClick = () => {
    setEditingEvent(null);
    setFormData({
      ...initialFormState,
    });
    setIsModalOpen(true);
  };

  // Save Event
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: formData.title,
      subtitle: formData.subtitle,
      category: formData.category,
      date: formData.date,
      time: formData.time,
      locationCity: formData.locationCity,
      venue: formData.venue,
      organizer: formData.organizer,
      registrationFee: formData.registrationFee,
      maxAttendees: Number(formData.maxAttendees),
      ...(formData.registrationDeadline !== dhakaDateInput(editingEvent?.registrationDeadline)
        ? { registrationDeadline: formData.registrationDeadline || null }
        : {}),
      bannerImage: formData.bannerImage,
      description: formData.description,
      isRegistrationOpen: formData.registrationEnabled,
    };
    const res = await fetch(editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events", {
      method: editingEvent ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) return showToast(result.error || "Could not save the event.");
    showToast(editingEvent ? `Event "${formData.title}" updated.` : `Event "${formData.title}" created.`);
    setIsModalOpen(false);
    load();
  };

  // Delete Event
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    const result = await res.json();
    setDeleteConfirmId(null);
    if (!res.ok) return showToast(result.error || "Could not delete the event.");
    showToast("Event deleted.");
    load();
  };

  // Export the real registration roster as CSV
  const handleExportCSV = async (event: PublicEvent) => {
    const res = await fetch(`/api/admin/events/${event.id}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) return showToast(body.error || "Could not export registrations.");
    const rows = (body.registrations as AdminRegistration[]).map((a) =>
      [a.name, a.batch ?? "", a.email, a.phone, a.packageName ?? "", a.headCount, a.totalFee, a.donationAmount, a.paymentMethod ?? "", a.transactionId ?? "", a.status]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = "Name,Batch,Email,Phone,Package,Head_Count,Fee_BDT,Donation_BDT,Payment_Method,Trx_ID,Status\n" + rows.join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, "_")}_RSVPs.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported registrations for "${event.title}"`);
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== "ALL" && e.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.locationCity.toLowerCase().includes(q) ||
        e.organizer.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = ["ALL", "REUNION", "SPORTS", "WEBINAR", "CULTURAL", "COMMUNITY"] as const;

  // Calculate High Level Metrics
  const totalRSVPs = events.reduce((sum, e) => sum + (e.attendeesCount || 0), 0);
  const milestone = events.find((e) => e.isMegaEvent);
  const totalCapacity = events.reduce((sum, e) => sum + (e.maxAttendees || 0), 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Events &amp; Reunions Studio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage every detail of reunions, golden jubilee milestones, custom packages, agendas, and attendee rosters.
          </p>
        </div>

        <button
          onClick={handleCreateClick}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Events</span>
          <strong className="text-xl font-black text-slate-900 block my-0.5">{events.length}</strong>
          <span className="text-[11px] text-emerald-700 font-medium">Reunions &amp; Gatherings</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active RSVPs</span>
          <strong className="text-xl font-black text-emerald-800 block my-0.5">{totalRSVPs.toLocaleString()}</strong>
          <span className="text-[11px] text-slate-500">Across all batches</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Capacity</span>
          <strong className="text-xl font-black text-slate-900 block my-0.5">{totalCapacity.toLocaleString()}</strong>
          <span className="text-[11px] text-slate-500">Available seating</span>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-900 block flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-700" /> Milestone
          </span>
          <strong className="text-base font-black text-slate-950 block my-0.5 line-clamp-1">{milestone?.title ?? "No milestone event"}</strong>
          <span className="text-[11px] text-amber-800 font-semibold">
            {milestone ? `${milestone.date} • ${milestone.attendeesCount} RSVPs` : "Mark an event as a landmark"}
          </span>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, venue, organizer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-800 text-sm">No events found</h3>
            <p className="text-xs">Try adjusting your search criteria or create a new event.</p>
          </div>
        ) : (
          filteredEvents.map((e) => (
            <div
              key={e.id}
              className={`bg-white p-5 rounded-3xl border shadow-xs transition-all hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                e.isMegaEvent ? "border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10" : "border-slate-200"
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex flex-col items-center justify-center font-black text-emerald-900 shrink-0 border border-emerald-200 shadow-xs">
                  <span className="text-lg leading-tight">
                    {new Date(e.date).getDate() || 30}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700">
                    {new Date(e.date).toLocaleString("default", { month: "short" }) || "Dec"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      {e.category}
                    </span>
                    {e.isMegaEvent && (
                      <span className="text-[10px] font-black text-amber-900 uppercase bg-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-800" /> 50-Year Landmark
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        e.isRegistrationOpen
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-600 border border-red-200"
                      }`}
                    >
                      {e.isRegistrationOpen ? "Registration Open" : "Closed"}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 hover:text-emerald-800 transition-colors">
                    {e.title}
                  </h3>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {e.venue}, {e.locationCity}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {e.time}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      {e.attendeesCount} / {e.maxAttendees} RSVPs
                    </span>
                    {e.registrationFee && (
                      <>
                        <span>•</span>
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          {e.registrationFee}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-end lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-end">
                {/* Dedicated Deep Dive Studio Link */}
                <Link
                  href={`/admin/events/${e.id}`}
                  className="px-3.5 py-2 bg-[#06281e] hover:bg-[#0b3d2c] text-amber-300 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Configure each and every detail in Event Studio"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-300" />
                  <span>Studio &amp; All Details</span>
                </Link>

                <Link
                  href={`/events/${e.slug}`}
                  target="_blank"
                  className="p-2 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors border border-slate-200 hover:border-emerald-300"
                  title="View Public Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => handleExportCSV(e)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Export Registered Attendees"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export RSVPs</span>
                </button>

                <button
                  onClick={() => handleEditClick(e)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-colors border border-emerald-200 hover:border-emerald-300 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Quick Edit</span>
                </button>

                <button
                  onClick={() => setDeleteConfirmId(e.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                  title="Delete Event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block mb-1">
                  {editingEvent ? "Event Management Studio" : "New Event Publisher"}
                </span>
                <h3 className="text-lg font-bold">
                  {editingEvent ? `Edit: ${formData.title}` : "Create New Alumni Gathering"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 50 Years Golden Jubilee Grand Celebration"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Half a Century of Knowledge, Legacy & Brotherhood"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as EventItem["category"],
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="REUNION">REUNION</option>
                    <option value="SPORTS">SPORTS</option>
                    <option value="WEBINAR">WEBINAR</option>
                    <option value="CULTURAL">CULTURAL</option>
                    <option value="COMMUNITY">COMMUNITY</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Time &amp; Schedule Notes *</label>
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="e.g. Approx. Date: December 30, 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Location City *</label>
                  <input
                    type="text"
                    required
                    value={formData.locationCity}
                    onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                    placeholder="e.g. Chattogram"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Venue &amp; Address *</label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. Main Campus Grounds & Central Convention Center, Sitakunda"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Organizing Body</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="e.g. Golden Jubilee Steering Committee & SSGHS Alumni"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Registration Fee (৳, 0 = free)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.registrationFee}
                    onChange={(e) => setFormData({ ...formData, registrationFee: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxAttendees}
                    onChange={(e) => setFormData({ ...formData, maxAttendees: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Registration Deadline</label>
                  <input
                    type="date"
                    value={formData.registrationDeadline}
                    onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Banner Image URL</label>
                <input
                  type="text"
                  value={formData.bannerImage}
                  onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                  placeholder="e.g. /golden-jubilee.jpg"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Event Description *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of activities, guest honors, and banquet details..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="regOpen"
                  checked={formData.registrationEnabled}
                  onChange={(e) => setFormData({ ...formData, registrationEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="regOpen" className="font-bold text-slate-700 cursor-pointer select-none">
                  Enable Public RSVP &amp; Ticket Registration
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEvent ? "Save Changes" : "Publish Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-slate-900">Remove Event?</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete this event? This will remove the listing and archive registration records.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-colors"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
