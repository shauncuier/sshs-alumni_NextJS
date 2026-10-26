"use client";

import React, { useEffect, useState } from "react";
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
  ChevronDown,
  MessageSquare,
  ScrollText,
  Newspaper,
  Images,
  BookOpen,
  Briefcase,
  GraduationCap,
  IdCard,
  FilePlus2,
  Megaphone,
  Landmark,
  Medal,
  FileText,
  Calculator,
  Settings,
} from "lucide-react";

export interface AdminShellUser {
  email: string | null;
  role: string;
}

export interface AdminShellProps {
  children: React.ReactNode;
  user?: AdminShellUser;
}

type NavItem = { name: string; short: string; href: string; icon: React.ComponentType<{ className?: string }>; area: AdminArea };

// The admin menu in groups; each role sees only the items lib/permissions.ts allows it.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ name: "Dashboard", short: "Dashboard", href: "/admin", icon: LayoutDashboard, area: "dashboard" }] },
  {
    label: "Members",
    items: [
      { name: "Verify payments & docs", short: "Verify", href: "/admin/verifications", icon: ShieldCheck, area: "verifications" },
      { name: "Members", short: "Members", href: "/admin/alumni", icon: UserCheck, area: "alumni" },
      { name: "ID cards", short: "ID cards", href: "/admin/id-cards", icon: IdCard, area: "alumni" },
      { name: "Batches", short: "Batches", href: "/admin/batches", icon: Layers, area: "batches" },
      { name: "Volunteers", short: "Volunteers", href: "/admin/volunteers", icon: HeartHandshake, area: "volunteers" },
    ],
  },
  {
    label: "Events",
    items: [
      { name: "Events", short: "Events", href: "/admin/events", icon: Calendar, area: "events" },
      { name: "Paper forms", short: "Paper form", href: "/admin/events/offline", icon: FilePlus2, area: "events" },
      { name: "Gate scanner", short: "Gate", href: "/gate", icon: QrCode, area: "gate" },
    ],
  },
  {
    label: "Money",
    items: [
      { name: "Accounts", short: "Accounts", href: "/admin/accounts", icon: Calculator, area: "accounts" },
      { name: "Donations", short: "Donations", href: "/admin/donations", icon: Heart, area: "donations" },
    ],
  },
  {
    label: "Website",
    items: [
      { name: "News", short: "News", href: "/admin/news", icon: Newspaper, area: "news" },
      { name: "Notice board", short: "Notices", href: "/admin/notices", icon: Megaphone, area: "notices" },
      { name: "Gallery", short: "Gallery", href: "/admin/gallery", icon: Images, area: "gallery" },
      { name: "Stories & achievements", short: "Stories", href: "/admin/stories", icon: BookOpen, area: "stories" },
      { name: "Jobs", short: "Jobs", href: "/admin/jobs", icon: Briefcase, area: "jobs" },
      { name: "Mentors", short: "Mentors", href: "/admin/mentors", icon: GraduationCap, area: "mentors" },
    ],
  },
  {
    label: "Association",
    items: [
      { name: "Executive committee", short: "Committee", href: "/admin/committee", icon: Landmark, area: "committee" },
      { name: "Honor board", short: "Honor board", href: "/admin/honor-board", icon: Medal, area: "committee" },
      { name: "Constitution", short: "Constitution", href: "/admin/constitution", icon: FileText, area: "committee" },
    ],
  },
  { label: "Messages", items: [{ name: "Bulk SMS", short: "SMS", href: "/admin/sms", icon: MessageSquare, area: "sms" }] },
  {
    label: "System",
    items: [
      { name: "Settings", short: "Settings", href: "/admin/settings", icon: Settings, area: "settings" },
      { name: "Users & roles", short: "Users", href: "/admin/users", icon: Users, area: "users" },
      { name: "Activity log", short: "Logs", href: "/admin/logs", icon: ScrollText, area: "logs" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const COLLAPSED_KEY = "admin-nav-collapsed";

/** The menu item a path belongs to: the longest matching link, so /admin/events/[id] is "Events". */
function activeFor(items: NavItem[], pathname: string): NavItem | undefined {
  return [...items].sort((a, b) => b.href.length - a.href.length).find((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)));
}

function GroupedNav({ role, pathname, onNavigate, large = false }: { role: string | undefined; pathname: string; onNavigate?: () => void; large?: boolean }) {
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(role, i.area)) })).filter((g) => g.items.length > 0);
  const active = activeFor(groups.flatMap((g) => g.items), pathname);
  // Groups the admin closed stay closed (per browser); the group of the open page is always open.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]");
      if (Array.isArray(saved)) setCollapsed(saved.filter((x) => typeof x === "string")); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // Storage unavailable: every group starts open.
    }
  }, []);
  const toggle = (label: string) =>
    setCollapsed((c) => {
      const next = c.includes(label) ? c.filter((x) => x !== label) : [...c, label];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Not remembered; harmless.
      }
      return next;
    });

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const holdsActive = group.items.some((i) => i === active);
        const open = holdsActive || !collapsed.includes(group.label);
        // A group of one item needs no heading to open or close.
        const single = group.items.length === 1 && group.label === "Overview";
        return (
          <div key={group.label}>
            {!single && (
              <button
                type="button"
                onClick={() => toggle(group.label)}
                aria-expanded={open}
                disabled={holdsActive}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-400/70 hover:text-emerald-300 disabled:cursor-default cursor-pointer"
              >
                <span>{group.label}</span>
                {!holdsActive && <ChevronDown className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`} />}
              </button>
            )}
            {open && (
              <ul className="mt-0.5 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item === active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 rounded-lg text-[13px] font-medium transition-colors ${large ? "py-2.5 min-h-[44px]" : "py-2"} ${
                          isActive ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-300 hover:bg-emerald-950 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-950" : "text-amber-300/90"}`} />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const roleLabel = effectiveRole === "SUPER_ADMIN" ? "Super Admin" : effectiveRole === "MODERATOR" ? "Moderator" : effectiveRole === "TREASURER" ? "Treasurer" : "Administrator";
  // Only the sections this role may use (lib/permissions.ts); pages and APIs check the same map.
  const navItems = ALL_ITEMS.filter((item) => can(effectiveRole, item.area));
  const userEmail = user?.email ?? null;
  const activeItem = activeFor(navItems, pathname) || navItems[0] || ALL_ITEMS[0];
  // Bottom bar on phones: the first three sections this role may use.
  const quickItems = navItems.filter((item) => item.area !== "gate").slice(0, 3);

  const brand = (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-9 h-9 rounded-full bg-white ring-2 ring-amber-400/60 overflow-hidden shrink-0">
        <img src="/logo.png" alt="" className="w-full h-full object-contain" />
      </span>
      <div className="min-w-0">
        <div className="font-bold text-sm text-white leading-tight truncate">Admin</div>
        <div className="text-[10px] text-amber-300 font-semibold truncate">প্রাক্তন সবুজিয়ান পরিষদ</div>
      </div>
    </div>
  );
  const footer = (
    <div className="p-3 border-t border-emerald-950 text-xs">
      <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-950">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to the website
      </Link>
      <div className="px-3 pt-2 text-slate-400">
        <span className="font-semibold text-slate-200">{roleLabel}</span>
        {userEmail && <span className="block text-[10px] truncate">{userEmail}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100">
      {/* Phones and tablets: top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#041a13] text-white border-b border-emerald-950 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full bg-white ring-2 ring-amber-400/60 overflow-hidden shrink-0">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-xs text-white leading-none">Admin</div>
            <div className="text-[11px] text-amber-300 font-semibold mt-0.5 truncate">{activeItem.name}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-200 hover:text-white rounded-lg bg-emerald-900/60 active:bg-emerald-800 transition-colors cursor-pointer"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileMenuOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />}

      {/* Phones and tablets: slide-in menu */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#041a13] text-white border-r border-emerald-950 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-emerald-900/60 flex items-center justify-between gap-2">
          {brand}
          <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-emerald-900/60">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav aria-label="Admin" className="flex-1 px-3 py-3 overflow-y-auto" suppressHydrationWarning>
          <GroupedNav role={effectiveRole} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} large />
        </nav>
        {footer}
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden lg:flex w-60 bg-[#041a13] text-white border-r border-emerald-950 flex-col shrink-0 h-screen sticky top-0">
        <div className="px-4 py-4 border-b border-emerald-900/60">{brand}</div>
        <nav aria-label="Admin" className="flex-1 px-2.5 py-3 overflow-y-auto" suppressHydrationWarning>
          <GroupedNav role={effectiveRole} pathname={pathname} />
        </nav>
        {footer}
      </aside>

      {/* Main content (room at the bottom on phones for the quick bar) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-clip min-h-screen pb-20 lg:pb-0">{children}</div>

      {/* Phones: quick bar */}
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
        <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">
          <Menu className="w-5 h-5 mb-0.5 text-amber-300" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
