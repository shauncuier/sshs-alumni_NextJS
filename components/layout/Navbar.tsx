"use client";

import React, { useState, useEffect, useRef } from "react";
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
  UserPlus,
  LogIn,
  LogOut,
  User,
  HeartHandshake,
  Sparkles,
  ExternalLink
} from "lucide-react";
import GlobalSearchModal from "@/components/shared/GlobalSearchModal";

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
  }, [pathname]);

  // Primary navigation links with clean single-line naming
  const primaryLinks = [
    { name: "Home", href: "/" },
    { name: "Directory", href: "/alumni" },
    { name: "Batches", href: "/batches" },
    { name: "Events", href: "/events" },
    { name: "Stories", href: "/stories" },
    { name: "Giving Back", href: "/donate", highlight: true },
  ];

  // Secondary institutional links
  const moreLinks = [
    {
      name: "About Association",
      href: "/about",
      icon: Users,
      desc: "Constitution, leadership & executive committee",
    },
    {
      name: "School Heritage",
      href: "/school",
      icon: Building2,
      desc: "Campus legacy, historical archives & EIIN: 105070",
    },
    {
      name: "Hall of Fame",
      href: "/achievements",
      icon: Award,
      desc: "Distinguished alumni national & global honors",
    },
    {
      name: "Photo Memories",
      href: "/gallery",
      icon: ImageIcon,
      desc: "Nostalgic albums, batch photos & campus life",
    },
    {
      name: "News & Bulletins",
      href: "/news",
      icon: BookOpen,
      desc: "Official association notices and circulars",
    },
    {
      name: "Contact Secretariat",
      href: "/contact",
      icon: PhoneCall,
      desc: "Reach out to the executive alumni office",
    },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled ? "shadow-2xl shadow-black/25" : "shadow-md"
        }`}
      >
        {/* Top Institutional Utility Ribbon */}
        <div className="bg-[#041a13] border-b border-emerald-900/60 text-slate-300 text-[11px] font-medium tracking-normal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
            {/* Left: Official School Accreditation */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/90 text-amber-300/90 border border-amber-400/20 text-[10px] font-semibold tracking-wider uppercase shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                Govt. High School
              </span>
              <span className="text-slate-300/90 truncate hidden md:inline">
                Sabuj Shikshayatan Government High School
              </span>
              <span className="text-emerald-700 hidden lg:inline">•</span>
              <span className="text-slate-400 hidden lg:inline font-mono text-[10px]">
                EIIN: 105070
              </span>
              <span className="text-emerald-700 hidden xl:inline">•</span>
              <span className="text-slate-400 hidden xl:inline">Sitakunda, Chattogram</span>
            </div>

            {/* Right: Portal Access & Quick Links */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-[11px]">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Member Portal</span>
                <span className="sm:hidden">Portal</span>
              </Link>

              <span className="text-emerald-900 select-none">|</span>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-amber-300/90 hover:text-amber-200 transition-colors font-medium"
              >
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Admin Console</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="bg-[#06281e]/98 backdrop-blur-xl border-b border-emerald-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-[72px] flex items-center justify-between gap-3 sm:gap-6">
            
            {/* 1. Official Identity & Crest */}
            <Link
              href="/"
              className="flex items-center gap-3.5 group shrink-0 select-none"
              aria-label="SSGHS Alumni Association Home"
            >
              {/* Official Alumni Seal / Crest */}
              <div className="relative w-12 h-12 rounded-full p-0.5 shadow-lg shadow-black/40 ring-2 ring-amber-400/50 bg-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 shrink-0 overflow-hidden">
                <NextImage
                  src="/logo.png"
                  alt="SSGHS Alumni Association Official Crest"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain rounded-full"
                  priority
                />
              </div>

              {/* Wordmark Hierarchy */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">
                    SSGHS
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30 leading-none">
                    Alumni
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-emerald-200/90 tracking-normal mt-1 leading-tight line-clamp-1">
                  Sabuj Shikshayatan Govt. High School
                </span>
                <span className="text-[10px] text-emerald-400/70 font-normal leading-none mt-0.5 hidden xl:block">
                  সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় প্রাক্তন ছাত্র-ছাত্রী পরিষদ
                </span>
              </div>
            </Link>

            {/* 2. Desktop Navigation Menu */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-[13px] font-medium whitespace-nowrap">
              {primaryLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg transition-all duration-150 relative ${
                      isActive
                        ? "text-white font-semibold bg-emerald-800/60 border border-emerald-600/40 shadow-sm"
                        : link.highlight
                        ? "text-amber-300 hover:text-white hover:bg-amber-400/10 font-semibold"
                        : "text-slate-200 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {link.highlight && (
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      {link.name}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    )}
                  </Link>
                );
              })}

              {/* Institutional Dropdown */}
              <div
                className="relative"
                ref={dropdownRef}
                onMouseEnter={() => setMoreDropdownOpen(true)}
                onMouseLeave={() => setMoreDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                    moreDropdownOpen
                      ? "text-white bg-emerald-800/60"
                      : "text-slate-200 hover:text-white hover:bg-white/5"
                  }`}
                  aria-expanded={moreDropdownOpen}
                >
                  <span>More</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
                      moreDropdownOpen ? "rotate-180 text-amber-300" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Box */}
                {moreDropdownOpen && (
                  <div className="absolute right-0 top-full pt-2 w-84 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-[#052118] border border-emerald-700/70 rounded-2xl shadow-2xl shadow-black/70 p-2 space-y-1">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 border-b border-emerald-900/60 flex items-center justify-between">
                        <span>Institutional Pages</span>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      </div>

                      {moreLinks.map((item) => {
                        const Icon = item.icon;
                        const isSubActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMoreDropdownOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                              isSubActive
                                ? "bg-emerald-800 text-white border border-emerald-600/40"
                                : "hover:bg-emerald-900/60 text-slate-200"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#041a13] flex items-center justify-center text-amber-400 shrink-0 border border-emerald-800/80">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-white leading-tight">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-slate-300/80 mt-0.5 leading-snug line-clamp-1">
                                {item.desc}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* 3. Action Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap">
              {/* Global Search Icon Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="h-9 w-9 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-slate-300 hover:text-white border border-emerald-800/70 flex items-center justify-center transition-all shadow-inner"
                title="Search Alumni, Batches, Events (Ctrl+K)"
                aria-label="Search directory"
              >
                <Search className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Auth Buttons: Logged In vs Logged Out */}
              {isAuthenticated ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-white text-xs font-semibold border border-emerald-700/60 transition-colors shadow-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-600 border border-amber-400/40 flex items-center justify-center text-[10px] text-amber-300 font-bold shrink-0">
                      {session?.user?.name ? session.user.name[0] : "A"}
                    </div>
                    <span className="max-w-[110px] truncate text-slate-100">
                      {session?.user?.name?.split(" ")[0] || "Portal"}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="h-9 w-9 rounded-lg bg-emerald-950/80 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-emerald-800/70 hover:border-red-800/70 flex items-center justify-center transition-colors shadow-inner"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold tracking-tight shadow-md shadow-emerald-950/50 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Mobile Drawer Trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden h-9 w-9 rounded-lg bg-emerald-950 text-slate-200 hover:text-white hover:bg-emerald-900 border border-emerald-800 flex items-center justify-center transition-colors"
                aria-label="Toggle mobile navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#052118] border-t border-emerald-800/80 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
            {/* Search Trigger for Mobile */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-slate-300 text-xs"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Search alumni, batches, events...</span>
              </span>
              <kbd className="px-1.5 py-0.5 bg-[#03150f] text-[10px] text-amber-300 rounded font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Primary Navigation Links */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {primaryLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isActive
                        ? "bg-emerald-800 text-white border border-emerald-600"
                        : "bg-emerald-950/60 text-slate-200 hover:bg-emerald-900"
                    }`}
                  >
                    <span>{link.name}</span>
                    {link.highlight && (
                      <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Institutional Sub-links */}
            <div className="pt-3 border-t border-emerald-900/80">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 px-1 mb-2">
                Explore Association
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {moreLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
                        isActive
                          ? "bg-emerald-800 text-white"
                          : "text-slate-300 hover:bg-emerald-900/60 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Auth Action Button */}
            <div className="pt-3 border-t border-emerald-900/80">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2 text-xs text-slate-300">
                    <span className="truncate">
                      Signed in as <strong className="text-white">{session?.user?.name}</strong>
                    </span>
                    <span className="text-[10px] text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 uppercase font-bold shrink-0">
                      {(session?.user as unknown as { role?: string })?.role || "Member"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 text-center bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="py-2.5 text-center bg-emerald-950 hover:bg-red-950 text-slate-300 hover:text-red-300 rounded-xl text-xs font-semibold border border-emerald-800"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Alumni Portal</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
