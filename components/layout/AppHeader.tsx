"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  Search,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import GlobalSearchModal from "@/components/shared/GlobalSearchModal";

interface AppHeaderProps {
  title?: string;
}

export default function AppHeader({ title = "Alumni Portal" }: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = [
    { id: 1, text: "Dr. Nusrat Jahan accepted your connection request.", time: "10m ago", read: false },
    { id: 2, text: "Annual Alumni Reunion 2026 registration is now open!", time: "1h ago", read: false },
    { id: 3, text: "Farhana Rahman commented on your post.", time: "3h ago", read: true },
    { id: 4, text: "Batch 2008 informal meetup scheduled for this Friday.", time: "1d ago", read: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Left: Title & Quick Search */}
        <div className="flex items-center gap-4">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h1>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-500 text-xs transition-colors border border-slate-200"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search directory or events...</span>
            <kbd className="px-1 bg-white text-[10px] rounded border border-slate-300 text-slate-400">⌘K</kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Messages Link */}
          <Link
            href="/messages"
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-800 transition-colors relative"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-600 rounded-full ring-2 ring-white" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  <Link href="/notifications" className="text-[11px] text-emerald-700 font-semibold hover:underline">
                    View all
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs hover:bg-slate-50 transition-colors ${
                        !n.read ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      <p className="text-slate-800 leading-snug">{n.text}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                alt="You"
                className="w-8 h-8 rounded-full object-cover border border-emerald-300"
              />
              <span className="hidden md:inline text-xs font-bold text-slate-800">
                Jashedul
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">Md. Jashedul Islam</div>
                  <div className="text-[10px] text-slate-500">SSC Batch 2008 • Verified</div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  <User className="w-3.5 h-3.5 text-emerald-700" /> My Profile
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-700" /> Account Settings
                </Link>

                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-amber-700 font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Admin Console
                </Link>

                <div className="pt-1 border-t border-slate-100">
                  <Link
                    href="/login"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-rose-600 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
