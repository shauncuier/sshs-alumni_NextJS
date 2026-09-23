"use client";

import React from "react";
import { sampleEvents } from "@/lib/data";
import { Calendar, Plus, Users, MapPin, Edit, Trash2 } from "lucide-react";

export default function AdminEventsPage() {
  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Events &amp; Reunions Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create reunions, cricket tournaments, view attendee RSVP rosters, and manage ticket allocations.
          </p>
        </div>

        <button className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      <div className="space-y-4">
        {sampleEvents.map((e) => (
          <div
            key={e.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center font-bold text-emerald-900 shrink-0 border border-emerald-200">
                <span className="text-base leading-none">{new Date(e.date).getDate()}</span>
                <span className="text-[10px] uppercase text-emerald-600">
                  {new Date(e.date).toLocaleString("default", { month: "short" })}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {e.category}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">{e.title}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>{e.venue}, {e.locationCity}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">{e.attendeesCount} / {e.maxAttendees} RSVPs</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors">
                Export RSVPs (CSV)
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
