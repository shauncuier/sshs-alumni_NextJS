"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BadgeCheck, MapPin, Briefcase, GraduationCap, UserPlus, Check, MessageSquare } from "lucide-react";
import { AlumniMember } from "@/lib/data";

interface AlumniCardProps {
  alumni: AlumniMember;
  viewMode?: "grid" | "list";
}

export default function AlumniCard({ alumni, viewMode = "grid" }: AlumniCardProps) {
  const [connected, setConnected] = useState(false);

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={alumni.avatarUrl}
              alt={alumni.fullName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-emerald-100 group-hover:border-emerald-500 transition-colors shadow-sm"
            />
            {alumni.isVerified && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full ring-2 ring-white shadow-sm" title="Verified Sabuj Shikshayatan Alumnus">
                <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/alumni?q=${encodeURIComponent(alumni.fullName)}`}
                className="font-bold text-slate-900 group-hover:text-emerald-800 text-base transition-colors"
              >
                {alumni.fullName}
              </Link>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 font-semibold rounded-full text-xs border border-emerald-200">
                SSC &apos;{alumni.sscBatch}
              </span>
              {alumni.isVerified && (
                <span className="text-[11px] font-medium text-emerald-600 hidden md:inline-flex items-center gap-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium text-slate-800">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {alumni.profession}
              </span>
              {alumni.company && <span>at {alumni.company}</span>}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {alumni.locationCity}, {alumni.locationCountry}
              </span>
              <span>•</span>
              <span>{alumni.connectionCount} connections</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => setConnected(!connected)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              connected
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-emerald-800 hover:bg-emerald-700 text-white shadow-sm"
            }`}
          >
            {connected ? (
              <>
                <Check className="w-3.5 h-3.5" /> Connected
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" /> Connect
              </>
            )}
          </button>
          <Link
            href={`/profile?id=${alumni.id}`}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      {/* Cover / Header Accent */}
      <div className="h-20 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 relative">
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md text-amber-300 font-bold rounded-full text-[11px] border border-white/10">
            Batch &apos;{alumni.sscBatch}
          </span>
        </div>
      </div>

      {/* Profile Avatar & Info */}
      <div className="px-5 pb-5 pt-0 flex-1 flex flex-col">
        <div className="relative -mt-10 mb-3 flex items-end justify-between">
          <div className="relative">
            <img
              src={alumni.avatarUrl}
              alt={alumni.fullName}
              className="w-18 h-18 rounded-2xl object-cover border-3 border-white shadow-md group-hover:scale-105 transition-transform"
            />
            {alumni.isVerified && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full ring-2 ring-white shadow" title="Verified Alumnus">
                <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium">
              {alumni.connectionCount} connections
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-3">
          <Link
            href={`/profile?id=${alumni.id}`}
            className="font-bold text-slate-900 group-hover:text-emerald-800 text-base leading-snug line-clamp-1 transition-colors"
          >
            {alumni.fullName}
          </Link>
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1 line-clamp-1">
            <Briefcase className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>{alumni.profession}</span>
          </div>
          {alumni.company && (
            <div className="text-xs text-slate-500 line-clamp-1">
              {alumni.company}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400 pt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{alumni.locationCity}, {alumni.locationCountry}</span>
          </div>
        </div>

        {/* Bio Preview */}
        {alumni.bio && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            &ldquo;{alumni.bio}&rdquo;
          </p>
        )}

        {/* Skills Pills */}
        <div className="flex flex-wrap gap-1.5 mt-auto mb-4">
          {alumni.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
            >
              {skill}
            </span>
          ))}
          {alumni.skills.length > 3 && (
            <span className="text-[10px] text-slate-400 font-medium self-center">
              +{alumni.skills.length - 3}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setConnected(!connected)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              connected
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-emerald-800 hover:bg-emerald-700 text-white shadow-sm"
            }`}
          >
            {connected ? (
              <>
                <Check className="w-3.5 h-3.5" /> Connected
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" /> Connect
              </>
            )}
          </button>
          <Link
            href={`/profile?id=${alumni.id}`}
            className="py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition-colors"
          >
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
