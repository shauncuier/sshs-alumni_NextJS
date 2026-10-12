"use client";

import React, { useState } from "react";
import BatchCard from "@/components/batches/BatchCard";
import type { BatchInfo } from "@/lib/data";

/** Batches with members first; years nobody has joined from yet stay hidden until asked for. */
export default function BatchGrid({ batches }: { batches: BatchInfo[] }) {
  const [showAll, setShowAll] = useState(false);
  const withMembers = batches.filter((b) => b.totalAlumni > 0);
  const shown = showAll ? batches : withMembers;
  const hidden = batches.length - withMembers.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {withMembers.length === 0
            ? "No batch has verified members yet."
            : `${withMembers.length} ${withMembers.length === 1 ? "batch has" : "batches have"} verified members.`}
        </p>
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-pressed={showAll}
            className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
          >
            {showAll ? "Show only batches with members" : `Show all years (${hidden} more)`}
          </button>
        )}
      </div>
      {shown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {shown.map((batch) => (
            <BatchCard key={batch.year} batch={batch} />
          ))}
        </div>
      )}
    </div>
  );
}
