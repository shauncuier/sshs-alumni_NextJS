"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Users,
  MessageSquare,
  User
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Portal", href: "/dashboard", icon: LayoutDashboard },
    { name: "Feed", href: "/feed", icon: Radio },
    { name: "Directory", href: "/alumni", icon: Users },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors touch-manipulation ${
                isActive
                  ? "text-emerald-800 font-bold"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-emerald-800" : ""}`} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
