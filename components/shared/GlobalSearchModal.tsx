"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, User, Calendar, BookOpen, Layers, Newspaper, ArrowRight } from "lucide-react";
import { sampleAlumni, sampleBatches, sampleStories, sampleNews, type EventItem } from "@/lib/data";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsError, setEventsError] = useState(false);
  useEffect(() => {
    if (!isOpen || events.length > 0) return;
    fetch("/api/events")
      .then((res) => {
        if (!res.ok) throw new Error(`Events request failed (${res.status})`);
        return res.json();
      })
      .then((b) => {
        setEventsError(false);
        setEvents(b.events);
      })
      .catch(() => setEventsError(true));
  }, [isOpen, events.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredAlumni = q
    ? sampleAlumni.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.profession.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          a.locationCity.toLowerCase().includes(q) ||
          a.sscBatch.toString().includes(q)
      )
    : [];

  const filteredBatches = q
    ? sampleBatches.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.year.toString().includes(q) ||
          b.tagline.toLowerCase().includes(q)
      )
    : [];

  const filteredEvents = q
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      )
    : [];

  const filteredStories = q
    ? sampleStories.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.authorName.toLowerCase().includes(q) ||
          s.profession.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    filteredAlumni.length +
    filteredBatches.length +
    filteredEvents.length +
    filteredStories.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-emerald-700 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search alumni, batches, events, news, or stories..."
            className="w-full bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-base"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 space-y-5">
          {query && eventsError && (
            <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              Events couldn&apos;t be loaded, so they are missing from these results. Please try again later.
            </p>
          )}
          {!query && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-medium">Type to search the Sabuj Shikshayatan community...</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["Batch 2008", "Cardiologist", "Reunion", "Software", "Doctor"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-base font-medium text-slate-600">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-sm mt-1">Try searching by batch year (e.g. 2008), profession, or classmate name.</p>
            </div>
          )}

          {/* Alumni Matches */}
          {filteredAlumni.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 px-1">
                <User className="w-3.5 h-3.5" /> Alumni ({filteredAlumni.length})
              </div>
              <div className="space-y-1">
                {filteredAlumni.slice(0, 4).map((alumnus) => (
                  <Link
                    key={alumnus.id}
                    href={`/alumni?q=${encodeURIComponent(alumnus.fullName)}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={alumnus.avatarUrl}
                        alt={alumnus.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-emerald-200"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-800 text-sm">
                          {alumnus.fullName}
                        </div>
                        <div className="text-xs text-slate-500">
                          SSC &apos;{alumnus.sscBatch} • {alumnus.profession} ({alumnus.locationCity})
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Batches Matches */}
          {filteredBatches.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 px-1">
                <Layers className="w-3.5 h-3.5" /> Batches ({filteredBatches.length})
              </div>
              <div className="space-y-1">
                {filteredBatches.slice(0, 3).map((batch) => (
                  <Link
                    key={batch.year}
                    href={`/batches/${batch.year}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                        &apos;{String(batch.year).slice(-2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-800 text-sm">
                          {batch.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {batch.totalAlumni} Members • Rep: {batch.classRepresentative}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Events Matches */}
          {filteredEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 px-1">
                <Calendar className="w-3.5 h-3.5" /> Events ({filteredEvents.length})
              </div>
              <div className="space-y-1">
                {filteredEvents.slice(0, 3).map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/events/${evt.slug ?? evt.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex flex-col items-center justify-center leading-tight">
                        <span>{new Date(evt.date).getDate()}</span>
                        <span className="text-[10px] uppercase">{new Date(evt.date).toLocaleString("default", { month: "short" })}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-800 text-sm">
                          {evt.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {evt.venue} • {evt.attendeesCount} Registered
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stories Matches */}
          {filteredStories.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 px-1">
                <BookOpen className="w-3.5 h-3.5" /> Stories ({filteredStories.length})
              </div>
              <div className="space-y-1">
                {filteredStories.slice(0, 2).map((story) => (
                  <Link
                    key={story.id}
                    href={`/stories/${story.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/80 transition-colors group"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-800 text-sm line-clamp-1">
                        {story.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        By {story.authorName} (SSC &apos;{story.batchYear}) • {story.readTime}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">ESC</kbd> to exit</span>
          <span className="text-emerald-700 font-medium">Sabuj Shikshayatan Alumni Global Search</span>
        </div>
      </div>
    </div>
  );
}
