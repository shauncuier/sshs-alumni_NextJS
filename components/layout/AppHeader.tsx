"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { canUseAdminPanel, homeForRole } from "@/lib/permissions";
import { useSession, signOut } from "next-auth/react";
import { Bell, MessageSquare, Search, User, Settings, LogOut, ShieldCheck } from "lucide-react";
import GlobalSearchModal from "@/components/shared/GlobalSearchModal";
import { useNotifications } from "@/components/notifications/useNotifications";
import { relativeTime } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
}

export default function AppHeader({ title = "Alumni Portal" }: AppHeaderProps) {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = session?.user;
  const userName = user?.name || "Alumnus";
  const userFirst = userName.split(" ")[0] || "User";
  const userBatch = user?.batchYear;
  const userRole = user?.role || "ALUMNI";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const userStatus = user?.status;
  const statusLabel = isAdmin
    ? "Administrator"
    : userStatus === "VERIFIED"
      ? "Verified Member"
      : userStatus === "REJECTED"
        ? "Not approved"
        : "Verification pending";
  const { items: notifications, unread, refresh, markRead } = useNotifications(Boolean(user));
  const router = useRouter();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Menus close on a click outside them or on Escape; Ctrl/⌘K opens search.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!notificationsRef.current?.contains(target)) setNotificationsOpen(false);
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

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
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="sm:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Messages Link */}
          <Link
            href="/messages"
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-800 transition-colors relative"
            title="Messages"
            aria-label="Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              aria-expanded={notificationsOpen}
              onClick={() => {
                if (!notificationsOpen) void refresh();
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />}
            </button>

            {notificationsOpen && (
              <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  <Link href="/notifications" onClick={() => setNotificationsOpen(false)} className="text-[11px] text-emerald-700 font-semibold hover:underline">
                    View all
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="p-3 text-xs text-slate-500">No notifications yet.</p>
                  )}
                  {notifications.slice(0, 6).map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead) void markRead([n.id]);
                        setNotificationsOpen(false);
                        router.push(n.link?.startsWith("/") ? n.link : "/notifications");
                      }}
                      className={`w-full text-left p-3 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.isRead ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      <p className="text-slate-800 leading-snug"><span className="font-bold">{n.title}</span> · {n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{relativeTime(new Date(n.createdAt))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* User Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-label="Account menu"
              aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {user?.image ? (
                <img loading="lazy" decoding="async"
                  src={user.image}
                  alt={userName}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xs border border-emerald-600">
                  {userFirst.charAt(0)}
                </div>
              )}
              <span className="hidden md:inline text-xs font-bold text-slate-800">
                {userFirst}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                <div className="px-4 py-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 truncate">{userName}</div>
                  <div className="text-[10px] text-slate-500">
                    {userBatch ? `SSC Batch ${userBatch} • ` : ""}{statusLabel}
                  </div>
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

                {canUseAdminPanel(userRole) && (
                  <Link
                    href={homeForRole(userRole)}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-amber-700 font-semibold"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Admin Console
                  </Link>
                )}

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 hover:bg-rose-50 text-rose-600 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
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
