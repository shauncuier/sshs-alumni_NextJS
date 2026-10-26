"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Users,
  Building2,
  Award,
  Image as ImageIcon,
  BookOpen,
  PhoneCall,
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  LogOut,
  HeartHandshake,
  Heart,
  Sparkles,
  Briefcase,
  GraduationCap,
  ScrollText,
  History,
  Medal,
  CalendarDays,
  Megaphone,
  Layers,
  UserPlus,
  UserRound,
} from "lucide-react";
import dynamic from "next/dynamic";

// Loaded only when someone opens search: it is not needed to show the page.
const GlobalSearchModal = dynamic(() => import("@/components/shared/GlobalSearchModal"), { ssr: false });
import { canUseAdminPanel, homeForRole } from "@/lib/permissions";

interface NavLink {
  name: string;
  href: string;
}

interface NavGroup {
  name: string;
  links: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; desc: string }[];
}

type NavItem = NavLink | NavGroup;

// Menu in the order of a classic alumni-association site: About, Committee, Members,
// News & Events, Community. Everything else lives inside the three dropdowns.
const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/" },
  {
    name: "About",
    links: [
      { name: "About the association", href: "/about", icon: Users, desc: "Who we are and what we do" },
      { name: "Our school", href: "/school", icon: Building2, desc: "History of the school, EIIN 105070" },
      { name: "Constitution", href: "/constitution", icon: ScrollText, desc: "The association's rules, as PDF" },
      { name: "Past committees", href: "/committee/past", icon: History, desc: "Committees of earlier terms" },
      { name: "Honor board", href: "/honor-board", icon: Medal, desc: "The people who led the association" },
      { name: "Golden Jubilee", href: "/jubilee", icon: Sparkles, desc: "50 years of the school" },
    ],
  },
  { name: "Committee", href: "/committee" },
  { name: "Members", href: "/alumni" },
  {
    name: "News & Events",
    links: [
      { name: "News", href: "/news", icon: BookOpen, desc: "News from the association and school" },
      { name: "Events", href: "/events", icon: CalendarDays, desc: "Reunions and programmes" },
      { name: "Notice board", href: "/notices", icon: Megaphone, desc: "Official notices from the committee" },
    ],
  },
  {
    name: "Community",
    links: [
      { name: "Giving back", href: "/donate", icon: Heart, desc: "Donate to the school and scholarships" },
      { name: "Batches", href: "/batches", icon: Layers, desc: "Find your SSC batch" },
      { name: "Career hub", href: "/careers", icon: Briefcase, desc: "Jobs shared by alumni" },
      { name: "Mentorship", href: "/mentorship", icon: GraduationCap, desc: "Guidance from senior alumni" },
      { name: "Stories", href: "/stories", icon: BookOpen, desc: "Alumni life stories" },
      { name: "Hall of fame", href: "/achievements", icon: Award, desc: "Alumni achievements" },
      { name: "Photo gallery", href: "/gallery", icon: ImageIcon, desc: "Albums and memories" },
      { name: "Volunteer", href: "/volunteer", icon: HeartHandshake, desc: "Help run events" },
      { name: "Contact", href: "/contact", icon: PhoneCall, desc: "Write to the committee" },
    ],
  },
];

const isGroupActive = (group: NavGroup, pathname: string) => group.links.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));

// Site-wide links do not prefetch: on mobile data, prefetching every menu and footer link
// on every page costs more than the faster click is worth.
export default function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  // The admin console link is only for staff; visitors and members never see it.
  const role = session?.user?.role;
  const adminHref = role && canUseAdminPanel(role) ? homeForRole(role) : null;
  const firstName = session?.user?.name?.split(" ")[0] || "Account";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [drawerTop, setDrawerTop] = useState(64);
  const navRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpenGroup(null);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the dropdowns on an outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setOpenGroup(null);
    setUserMenuOpen(false);
  }

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Pin the mobile drawer to the header's real bottom edge
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!mobileMenuOpen || !header) return;
    const update = () => setDrawerTop(header.getBoundingClientRect().bottom);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 w-full bg-[#06281e]/98 backdrop-blur-xl border-b border-emerald-800/60 transition-shadow duration-300 ${
          scrolled ? "shadow-xl shadow-black/25" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center gap-3 xl:gap-6">
          {/* Logo and the association's name, as on the logo: Bangla, then English */}
          <Link prefetch={false} href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 select-none" aria-label="Praktan Sabujian Parishad, home">
            <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white ring-2 ring-amber-400/60 shadow-md shadow-black/30 flex items-center justify-center overflow-hidden shrink-0">
              <NextImage src="/logo.png" alt="" width={48} height={48} className="w-full h-full object-contain" priority />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-extrabold text-[15px] sm:text-lg text-white whitespace-nowrap">প্রাক্তন সবুজিয়ান পরিষদ</span>
              <span className="hidden sm:block text-[11px] font-semibold text-amber-300/90 whitespace-nowrap">Praktan Sabujian Parishad</span>
            </span>
          </Link>

          {/* Desktop menu */}
          <nav ref={navRef} aria-label="Main" className="hidden xl:flex items-center gap-1 mx-auto text-sm font-medium whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              if ("href" in item) {
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    prefetch={false}
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative px-3 py-2 rounded-lg transition-colors ${active ? "text-white" : "text-slate-200 hover:text-white hover:bg-white/5"}`}
                  >
                    {item.name}
                    {active && <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-amber-400" />}
                  </Link>
                );
              }
              const open = openGroup === item.name;
              const active = isGroupActive(item, pathname);
              return (
                <div key={item.name} className="relative" onMouseEnter={() => setOpenGroup(item.name)} onMouseLeave={() => setOpenGroup(null)}>
                  <button
                    type="button"
                    onClick={() => setOpenGroup((g) => (g === item.name ? null : item.name))}
                    aria-expanded={open}
                    className={`relative px-3 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      open ? "text-white bg-white/5" : active ? "text-white" : "text-slate-200 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.name}
                    <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    {active && <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-amber-400" />}
                  </button>
                  {open && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
                      <div className={`bg-white rounded-2xl shadow-2xl shadow-black/30 border border-slate-200 p-2 grid gap-0.5 ${item.links.length > 6 ? "w-[34rem] grid-cols-2" : "w-72"}`}>
                        {item.links.map((sub) => {
                          const Icon = sub.icon;
                          const subActive = pathname === sub.href;
                          return (
                            <Link
                              prefetch={false}
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setOpenGroup(null)}
                              className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${subActive ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                            >
                              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold text-slate-900 leading-tight">{sub.name}</span>
                                <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">{sub.desc}</span>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Search, account and the mobile menu button */}
          <div className="flex items-center gap-2 ml-auto xl:ml-0 shrink-0">
            <button
              type="button"
              id="global-search-btn"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              title="Search alumni, batches, events (Ctrl+K)"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            {isAuthenticated ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-label="Your account"
                  className="h-10 flex items-center gap-2 pl-1 pr-2 sm:pr-3 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-700/60 text-white text-xs font-semibold cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 text-amber-200 flex items-center justify-center text-sm font-bold">{firstName[0]}</span>
                  <span className="hidden sm:inline max-w-[110px] truncate">{firstName}</span>
                  <ChevronDown className="hidden sm:block w-3.5 h-3.5 opacity-70" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full pt-2 z-50 w-56">
                    <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 border border-slate-200 p-1.5 text-sm">
                      <p className="px-3 py-2 text-xs text-slate-500 truncate border-b border-slate-100 mb-1">
                        Signed in as <strong className="text-slate-800">{session?.user?.name}</strong>
                      </p>
                      <Link prefetch={false} href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-800">
                        <LayoutDashboard className="w-4 h-4 text-emerald-700" /> Member dashboard
                      </Link>
                      <Link prefetch={false} href="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-800">
                        <UserRound className="w-4 h-4 text-emerald-700" /> My profile
                      </Link>
                      {adminHref && (
                        <Link prefetch={false} href={adminHref} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-800">
                          <ShieldCheck className="w-4 h-4 text-amber-600" /> Admin console
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 cursor-pointer mt-1 border-t border-slate-100"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link prefetch={false} href="/login" className="hidden sm:inline-flex items-center h-10 px-3 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10">
                  Sign in
                </Link>
                <Link
                  prefetch={false}
                  href="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold shadow-md transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Join</span>
                </Link>
              </>
            )}

            <button
              type="button"
              id="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="xl:hidden h-10 w-10 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 border border-emerald-700/60 flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-300" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" style={{ top: drawerTop }} onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}
      {mobileMenuOpen && (
        <div
          className="xl:hidden fixed inset-x-0 z-50 bg-[#052118] border-t border-emerald-800/80 px-4 py-4 space-y-4 overflow-y-auto overscroll-contain shadow-2xl animate-in slide-in-from-top-2 duration-200"
          style={{ top: drawerTop, maxHeight: `calc(100dvh - ${drawerTop}px)` }}
        >
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            {NAV_ITEMS.map((link) => {
              if (!("href" in link)) return null;
              const active = pathname === link.href;
              return (
                <Link
                  prefetch={false}
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2.5 px-2 rounded-xl text-center transition-colors ${active ? "bg-emerald-700 text-white" : "bg-emerald-950/70 text-slate-200 hover:bg-emerald-900"}`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {NAV_ITEMS.map((group) => {
            if ("href" in group) return null;
            return (
              <div key={group.name} className="pt-3 border-t border-emerald-900/80">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 px-1 mb-2">{group.name}</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;
                    return (
                      <Link
                        prefetch={false}
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${active ? "bg-emerald-800 text-white" : "text-slate-300 hover:bg-emerald-900/60 hover:text-white"}`}
                      >
                        <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-3 border-t border-emerald-900/80">
            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Link prefetch={false} href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-center bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                {adminHref ? (
                  <Link prefetch={false} href={adminHref} onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-center bg-emerald-950 text-amber-300 rounded-xl text-xs font-bold border border-emerald-800 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </Link>
                ) : (
                  <Link prefetch={false} href="/profile" onClick={() => setMobileMenuOpen(false)} className="py-2.5 text-center bg-emerald-950 text-slate-200 rounded-xl text-xs font-bold border border-emerald-800 flex items-center justify-center gap-1.5">
                    <UserRound className="w-4 h-4" /> Profile
                  </Link>
                )}
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="col-span-2 py-2.5 text-center text-rose-300 hover:bg-rose-950/40 rounded-xl text-xs font-semibold border border-emerald-800 flex items-center justify-center gap-1.5">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link prefetch={false} href="/register" onClick={() => setMobileMenuOpen(false)} className="py-2.5 flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black">
                  <UserPlus className="w-4 h-4" /> Become a member
                </Link>
                <Link prefetch={false} href="/login" onClick={() => setMobileMenuOpen(false)} className="py-2.5 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold">
                  <LogIn className="w-4 h-4" /> Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {searchOpen && <GlobalSearchModal isOpen onClose={() => setSearchOpen(false)} />}
    </>
  );
}
