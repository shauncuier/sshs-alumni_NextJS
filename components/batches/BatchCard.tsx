import React from "react";
import Link from "next/link";
import { Users, Calendar, ArrowRight, ShieldCheck } from "lucide-react";
import { BatchInfo } from "@/lib/data";

interface BatchCardProps {
  batch: BatchInfo;
}

export default function BatchCard({ batch }: BatchCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      {/* Cover Image */}
      <div className="relative h-44 overflow-hidden bg-slate-900">
        <img
          src={batch.coverImage}
          alt={batch.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Batch Badge */}
        <div className="absolute top-3 left-3 bg-[#06281e]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-400/40 text-amber-300 font-extrabold text-xs tracking-wider">
          {batch.name}
        </div>

        {/* Member Count */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white font-medium bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>{batch.totalAlumni} Registered Alumni</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
            {batch.tagline}
          </h3>
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            {batch.description}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Class Rep:
              </span>
              <span className="font-semibold text-slate-800">{batch.classRepresentative}</span>
            </div>
            {batch.reunionDate && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Next Reunion:
                </span>
                <span className="font-semibold text-amber-700">{batch.reunionDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link
            href={`/batches/${batch.year}`}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-emerald-800 text-slate-700 hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 group-hover:bg-emerald-800 group-hover:text-white shadow-sm"
          >
            <span>View Batch Page &amp; Members</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
