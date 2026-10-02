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

// Admin console chrome (sidebar and navigation). Access is checked by app/admin/layout.tsx.
export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveRole = user?.role || session?.user?.role;
  const roleLabel = effectiveRole === "SUPER_ADMIN" ? "Super Admin" : "Administrator";
  const userEmail = user?.email ?? (mounted ? session?.user?.email : null);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#041a13] text-white border-r border-emerald-950 flex flex-col shrink-0 min-h-screen">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {children}
      </div>
    </div>
  );
}
