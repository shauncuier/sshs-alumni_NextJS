"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { useNotifications, type MemberNotification } from "@/components/notifications/useNotifications";
import { relativeTime } from "@/lib/utils";
import { Bell, Calendar, Heart, Layers, MessageSquare, ShieldCheck } from "lucide-react";

const ICONS: Record<string, typeof Bell> = {
  CONNECTION: MessageSquare,
  POST: Heart,
  EVENT: Calendar,
  BATCH: Layers,
  ADMIN: ShieldCheck,
};

export default function NotificationsPage() {
  const { items, loaded, error, unread, markRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const shown = filter === "unread" ? items.filter((n) => !n.isRead) : items;

  const body = (n: MemberNotification) => (
    <>
      <p className="text-slate-900 font-bold">{n.title}</p>
      <p className="text-slate-700 leading-relaxed">{n.message}</p>
      <span className="text-[11px] text-slate-400 mt-1 block">{relativeTime(new Date(n.createdAt))}</span>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Notifications" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === f ? "bg-emerald-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
                >
                  {f === "all" ? "All" : `Unread (${unread})`}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void markRead()}
              disabled={unread === 0}
              className="text-xs font-semibold text-emerald-800 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-700">Couldn&apos;t load your notifications. Please refresh the page to try again.</p>
          )}

          {!loaded ? (
            <p className="text-xs text-slate-400 text-center py-10">Loading notifications…</p>
          ) : shown.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">{filter === "unread" ? "Nothing unread" : "No notifications yet"}</p>
              <p className="text-xs text-slate-500 mt-1">Messages, comments on your posts and notices from the committee will show up here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                const cls = `p-4 rounded-2xl border transition-all flex items-start gap-4 text-xs ${
                  n.isRead ? "bg-white/70 border-slate-200" : "bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-100"
                }`;
                const inner = (
                  <>
                    <div className={`p-2.5 rounded-xl shrink-0 ${n.isRead ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-800"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">{body(n)}</div>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />}
                  </>
                );
                // Only links inside the site.
                return n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? (
                  <Link key={n.id} href={n.link} onClick={() => !n.isRead && void markRead([n.id])} className={`${cls} hover:border-emerald-400`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={cls}>{inner}</div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
