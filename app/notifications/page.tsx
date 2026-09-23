"use client";

import React, { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { Bell, Check, UserPlus, Calendar, Heart, ShieldAlert, Sparkles } from "lucide-react";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const notifications = [
    { id: 1, type: "connection", icon: UserPlus, text: "Dr. Nusrat Jahan accepted your connection request.", time: "10 minutes ago", unread: true },
    { id: 2, type: "event", icon: Calendar, text: "Registration for Grand Alumni Reunion 2026 is officially open.", time: "1 hour ago", unread: true },
    { id: 3, type: "post", icon: Sparkles, text: "Farhana Rahman and 14 others liked your post about Batch 2008 meetup.", time: "3 hours ago", unread: false },
    { id: 4, type: "batch", icon: Bell, text: "Batch 2008 Class Representative appointed new welfare subcommittee.", time: "1 day ago", unread: false },
    { id: 5, type: "donation", icon: Heart, text: "Sabuj Shikshayatan STEM Lab Campaign reached 65% of its funding goal!", time: "2 days ago", unread: false },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Notifications" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Recent Notifications</h2>
            <button className="text-xs font-semibold text-emerald-800 hover:underline">
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                    n.unread
                      ? "bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-100"
                      : "bg-white/70 border-slate-200"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${n.unread ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="text-slate-800 font-medium leading-relaxed">{n.text}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                  {n.unread && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
