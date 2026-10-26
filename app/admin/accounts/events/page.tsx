"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Loader2 } from "lucide-react";
import { Banners } from "@/components/admin/content-kit";
import { AccountsHeader, useFinanceMeta } from "@/components/admin/finance-kit";

export default function AccountsEventsPage() {
  const { meta, error } = useFinanceMeta();
  return (
    <div className="p-4 sm:p-8 space-y-5 max-w-6xl w-full mx-auto">
      <AccountsHeader title="Event budgets" subtitle="Plan each event's budget and see its profit and loss against the plan." />
      <Banners error={error} notice={null} onDismiss={() => {}} />
      {!meta ? (
        <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : meta.events.length === 0 ? (
        <p className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">No events yet.</p>
      ) : (
        <ul className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100">
          {meta.events.map((ev) => (
            <li key={ev.id}>
              <Link href={`/admin/accounts/events/${ev.id}`} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                <CalendarDays className="w-5 h-5 text-emerald-700 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">{ev.title}</span>
                  <span className="block text-[11px] text-slate-500">{ev.date}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
