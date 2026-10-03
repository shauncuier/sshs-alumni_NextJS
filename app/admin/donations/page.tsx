"use client";

import React from "react";
import { sampleDonations } from "@/lib/data";
import { Heart, Plus, TrendingUp, Users, CheckCircle2 } from "lucide-react";

export default function AdminDonationsPage() {
  const totalRaised = sampleDonations.reduce((acc, c) => acc + c.raisedAmount, 0);
  const totalGoal = sampleDonations.reduce((acc, c) => acc + c.goalAmount, 0);
  const totalDonors = sampleDonations.reduce((acc, c) => acc + (c.donorCount || 0), 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Donation Campaigns &amp; Transparency Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor funds raised for scholarships, STEM laboratories, and school infrastructure.
          </p>
        </div>

        <button className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Launch New Fund
        </button>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Total Funds Collected</span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            ৳{totalRaised.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Active Campaign Goal</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ৳{totalGoal.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Total Unique Donors</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {totalDonors} Alumni
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="space-y-4">
        {sampleDonations.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {c.category}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{c.title}</h3>
              </div>
              <span className="text-xs font-bold text-slate-500">{c.daysLeft} days remaining</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700">Raised: ৳{c.raisedAmount.toLocaleString()}</span>
                <span className="text-slate-500">Goal: ৳{c.goalAmount.toLocaleString()}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.min((c.raisedAmount / c.goalAmount) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
