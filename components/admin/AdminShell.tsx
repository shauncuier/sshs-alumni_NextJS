"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  UserCheck,
  Layers,
  Calendar,
  Heart,
  Users,
  ShieldCheck,
  ArrowLeft,
  QrCode,
  HeartHandshake,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export interface AdminShellUser {
  email: string | null;
  role: string;
}

export interface AdminShellProps {
  children: React.ReactNode;
  user?: AdminShellUser;
}

const ADMIN_NAV = [
  { name: "Executive Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Verify Payments & Docs", href: "/admin/verifications", icon: ShieldCheck },
  { name: "Alumni Verification", href: "/admin/alumni", icon: UserCheck },
  { name: "Committee Volunteers", href: "/admin/volunteers", icon: HeartHandshake },
  { name: "Manage Batches", href: "/admin/batches", icon: Layers },
  { name: "Events & Reunions", href: "/admin/events", icon: Calendar },
  { name: "Gate Scanner", href: "/gate", icon: QrCode },
  { name: "Donations & Funds", href: "/admin/donations", icon: Heart },
  { name: "System Roles", href: "/admin/users", icon: Users },
] as const;

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const effectiveRole = user?.role || session?.user?.role;
  const roleLabel = effectiveRole === "SUPER_ADMIN" ? "Super Admin" : "Administrator";
  const userEmail = user?.email ?? (mounted ? session?.user?.email : null);

  const activeItem = ADMIN_NAV.find((item) => pathname === item.href) || ADMIN_NAV[0];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100">
      {/* Mobile Top Navigation Header (Phone / Tablet) */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#041a13] text-white border-b border-emerald-950 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-xs text-white leading-none">Admin Console</div>
            <div className="text-[10px] text-amber-300 font-semibold mt-0.5">{activeItem.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 text-emerald-300 hover:text-white rounded-lg bg-emerald-950/60 transition-colors"
            title="Back to Site"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-200 hover:text-white rounded-lg bg-emerald-900/60 active:bg-emerald-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#041a13] text-white border-r border-emerald-950 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-emerald-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">SSGHS Committee</div>
              <div className="text-[10px] text-amber-300 font-semibold">{roleLabel}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-emerald-900/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-xs text-emerald-300 hover:text-white px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Public Site
          </Link>
        </div>

        {/* Drawer Links */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto" suppressHydrationWarning>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                  isActive
                    ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                    : "text-slate-300 hover:bg-emerald-950 hover:text-white active:bg-emerald-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-950" : "text-amber-300"}`} />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : "text-slate-500"}`} />
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-950 text-xs text-slate-400 bg-[#03140e]">
          <div className="font-semibold text-slate-200">Logged in as {roleLabel}</div>
          {userEmail && <div className="text-[10px] text-slate-400 truncate">{userEmail}</div>}
        </div>
      </div>

      {/* Desktop Persistent Sidebar (Desktop Screens Only) */}
      <aside className="hidden lg:flex w-64 bg-[#041a13] text-white border-r border-emerald-950 flex-col shrink-0 min-h-screen">
        <div className="p-5 border-b border-emerald-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white leading-tight">Admin Console</div>
              <div className="text-[10px] text-amber-300 font-semibold">SSGHS Committee</div>
            </div>
          </div>
        </div>

        <div className="p-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-emerald-300 hover:text-white px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Main Site
          </Link>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" suppressHydrationWarning>
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                    : "text-slate-300 hover:bg-emerald-950 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-amber-300"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-950 text-xs text-slate-400">
          <div className="font-semibold text-slate-200">Logged in as {roleLabel}</div>
          {userEmail && <div className="text-[10px] text-slate-400 truncate">{userEmail}</div>}
        </div>
      </aside>

      {/* Main Content Area (Mobile-optimized with bottom padding for thumb navigation) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen pb-20 lg:pb-0">
        {children}
      </div>

      {/* Mobile Admin Bottom Navigation Bar (Fast 1-Thumb Switching on Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#041a13]/95 backdrop-blur-md border-t border-emerald-950/90 px-3 py-1.5 shadow-2xl flex items-center justify-around">
        <Link
          href="/admin"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors ${
            pathname === "/admin" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/admin/verifications"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors ${
            pathname === "/admin/verifications" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span>Verify Docs</span>
        </Link>

        <Link
          href="/admin/events"
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors ${
            pathname.startsWith("/admin/events") ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Events</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Menu className="w-5 h-5 mb-0.5 text-amber-300" />
          <span>All Menu</span>
        </button>
      </nav>
    </div>
  );
}
