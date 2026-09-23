"use client";

import React from "react";
import { sampleBatches } from "@/lib/data";
import { Layers, Plus, Users, Calendar, Phone, Edit } from "lucide-react";

export default function AdminBatchesPage() {
  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Batch Coordination Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign class representatives, schedule batch reunions, and manage batch welfare funds.
          </p>
        </div>

        <button className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add New Batch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleBatches.map((b) => (
          <div
            key={b.year}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                {b.name}
              </span>
              <button className="text-slate-400 hover:text-slate-600 p-1 rounded">
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-sm text-slate-900">{b.tagline}</h3>

            <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span>Total Alumni:</span>
                <span className="font-bold text-slate-800">{b.totalAlumni}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Class Rep:</span>
                <span className="font-bold text-slate-800">{b.classRepresentative}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rep Phone:</span>
                <span className="font-bold text-slate-800">{b.representativePhone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Next Reunion:</span>
                <span className="font-bold text-emerald-700">{b.reunionDate || "None scheduled"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
