"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { can, type AdminArea } from "@/lib/permissions";
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
  MessageSquare,
  ScrollText,
  Newspaper,
  Images,
  BookOpen,
  Briefcase,
  GraduationCap,
  Wallet,
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
  { name: "Executive Dashboard", short: "Dashboard", href: "/admin", icon: LayoutDashboard, area: "dashboard" },
  { name: "Verify Payments & Docs", short: "Verify", href: "/admin/verifications", icon: ShieldCheck, area: "verifications" },
  { name: "Alumni Verification", short: "Alumni", href: "/admin/alumni", icon: UserCheck, area: "alumni" },
  { name: "Bulk SMS Broadcast", short: "SMS", href: "/admin/sms", icon: MessageSquare, area: "sms" },
  { name: "Committee Volunteers", short: "Volunteers", href: "/admin/volunteers", icon: HeartHandshake, area: "volunteers" },
  { name: "Manage Batches", short: "Batches", href: "/admin/batches", icon: Layers, area: "batches" },
  { name: "Events & Reunions", short: "Events", href: "/admin/events", icon: Calendar, area: "events" },
  { name: "Gate Scanner", short: "Gate", href: "/gate", icon: QrCode, area: "gate" },
  { name: "Donations & Funds", short: "Donations", href: "/admin/donations", icon: Heart, area: "donations" },
  { name: "Payment Settings", short: "Payments", href: "/admin/payments", icon: Wallet, area: "payments" },
  { name: "User Management", short: "Users", href: "/admin/users", icon: Users, area: "users" },
  { name: "News", short: "News", href: "/admin/news", icon: Newspaper, area: "news" },
  { name: "Gallery", short: "Gallery", href: "/admin/gallery", icon: Images, area: "gallery" },
  { name: "Stories & Achievements", short: "Stories", href: "/admin/stories", icon: BookOpen, area: "stories" },
  { name: "Jobs", short: "Jobs", href: "/admin/jobs", icon: Briefcase, area: "jobs" },
  { name: "Mentors", short: "Mentors", href: "/admin/mentors", icon: GraduationCap, area: "mentors" },
  { name: "Activity Log", short: "Logs", href: "/admin/logs", icon: ScrollText, area: "logs" },
] as const satisfies readonly { name: string; short: string; href: string; icon: unknown; area: AdminArea }[];

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Close mobile drawer on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  const effectiveRole = user?.role || session?.user?.role;
  const roleLabel = effectiveRole === "SUPER_ADMIN" ? "Super Admin" : effectiveRole === "MODERATOR" ? "Moderator" : "Administrator";
  // Only the sections this role may use (lib/permissions.ts); pages and APIs check the same map.
  const navItems = ADMIN_NAV.filter((item) => can(effectiveRole, item.area));
  const userEmail = user?.email ?? null;

  // Longest matching section, so /admin/events/[id] is "Events", not the dashboard.
  const activeItem =
    [...navItems].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))) ||
    navItems[0] ||
    ADMIN_NAV[0];
  // Bottom bar on phones: the first three sections this role may use.
  const quickItems = navItems.filter((item) => item.area !== "gate").slice(0, 3);

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
            aria-label="Close menu"
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
          {navItems.map((item) => {
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
          {navItems.map((item) => {
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
      <div className="flex-1 flex flex-col min-w-0 overflow-x-clip min-h-screen pb-20 lg:pb-0">
        {children}
      </div>

      {/* Mobile Admin Bottom Navigation Bar (Fast 1-Thumb Switching on Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#041a13]/95 backdrop-blur-md border-t border-emerald-950/90 px-3 py-1.5 shadow-2xl flex items-center justify-around">
        {quickItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-colors ${active ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.short}</span>
            </Link>
          );
        })}

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
