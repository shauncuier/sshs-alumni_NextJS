"use client";

import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  User,
  Users,
  MessageSquare,
  Radio,
  Calendar,
  Bell,
  Settings,
  Heart,
  Image,
  Award,
  ShieldCheck,
  GraduationCap,
  LogOut,
  Layers
} from "lucide-react";

export default function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userBatch = (session?.user as unknown as { batchYear?: number })?.batchYear || 2008;
  const userRole = (session?.user as unknown as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Profile", href: "/profile", icon: User },
    { name: "Community Feed", href: "/feed", icon: Radio },
    { name: "My Network", href: "/network", icon: Users },
    { name: "Alumni Directory", href: "/alumni", icon: GraduationCap },
    { name: "My Batch", href: `/batches/${userBatch}`, icon: Layers },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Giving Back", href: "/donate", icon: Heart },
    { name: "Photo Gallery", href: "/gallery", icon: Image },
    { name: "Achievements", href: "/achievements", icon: Award },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#06281e] text-white border-r border-emerald-800/60 hidden lg:flex flex-col shrink-0 min-h-screen select-none">
      {/* Brand & Official Crest */}
      <div className="p-4 border-b border-emerald-800/60">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full p-0.5 ring-2 ring-amber-400/50 bg-white shadow flex items-center justify-center overflow-hidden shrink-0">
            <NextImage
              src="/logo.png"
              alt="SSGHS Crest"
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-tight leading-tight">
              SSGHS Alumni
            </div>
            <div className="text-[10px] text-emerald-300 font-semibold tracking-wide">
              Official Association Portal
            </div>
          </div>
        </Link>
      </div>

      {/* Dynamic Member Profile Quick Card */}
      <div className="p-4 mx-3 my-3 bg-[#0b3d2c]/80 rounded-2xl border border-emerald-700/50 flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xs shadow">
            {session?.user?.name ? session.user.name[0] : "A"}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#06281e] rounded-full" />
        </div>
        <div className="overflow-hidden min-w-0">
          <div className="text-xs font-bold text-white truncate">
            {session?.user?.name || "Verified Member"}
          </div>
          <div className="text-[10px] text-emerald-300 font-medium truncate">
            {isAdmin ? "Executive Council • Admin" : `SSC Batch ${userBatch} • Verified`}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-emerald-800 text-white shadow-inner border border-emerald-600/50"
                  : "text-slate-300 hover:text-white hover:bg-emerald-900/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-emerald-400"}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}

        {/* Dynamic Admin Link (Only for admins) */}
        {isAdmin && (
          <div className="pt-4 mt-2 border-t border-emerald-900/80">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Admin Management</span>
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Signout */}
      <div className="p-4 border-t border-emerald-900">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2.5 text-xs text-slate-400 hover:text-rose-400 transition-colors py-2 px-3 rounded-xl hover:bg-emerald-950 text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
