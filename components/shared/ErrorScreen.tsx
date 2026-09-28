import React from "react";
import NextImage from "next/image";

type Tone = "emerald" | "amber" | "rose" | "slate";

const TONES: Record<Tone, { icon: string; badge: string }> = {
  emerald: {
    icon: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badge: "bg-amber-400 text-slate-950",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-400 text-slate-950",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600 border-rose-200",
    badge: "bg-rose-600 text-white",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600 border-slate-200",
    badge: "bg-slate-800 text-white",
  },
};

interface ErrorScreenProps {
  /** Short status shown on the badge, e.g. "404" or "Offline". */
  code: string;
  title: string;
  message: React.ReactNode;
  icon: React.ReactNode;
  tone?: Tone;
  /** Technical reference for support, e.g. an error digest. */
  reference?: string;
  /** Action buttons and links. */
  children?: React.ReactNode;
}

/**
 * Shared layout for every error page (404, 401, 403, 500, offline), so they all
 * look like the rest of the portal. Plain markup with no hooks, so it works in
 * server and client error files alike.
 */
export default function ErrorScreen({
  code,
  title,
  message,
  icon,
  tone = "emerald",
  reference,
  children,
}: ErrorScreenProps) {
  const colors = TONES[tone];
  return (
    <div className="max-w-lg w-full mx-auto text-center space-y-6">
      <div className="relative inline-block">
        <div
          className={`w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl flex items-center justify-center border shadow-md ${colors.icon}`}
        >
          {icon}
        </div>
        <span
          className={`absolute -top-2 -right-3 px-3 py-1 font-black text-xs rounded-full shadow ${colors.badge}`}
        >
          {code}
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        <div className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">{message}</div>
        {reference && (
          <p className="text-[11px] text-slate-400 font-mono pt-1">Reference: {reference}</p>
        )}
      </div>

      {children && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">{children}</div>
      )}

      <div className="flex items-center justify-center gap-2 pt-4 text-[11px] text-slate-400">
        <NextImage src="/logo.png" alt="" width={20} height={20} className="rounded-full" />
        <span>Sabuj Shikshayatan Govt. High School Alumni Association</span>
      </div>
    </div>
  );
}

/** Button styles shared by error page actions. */
export const errorActionPrimary =
  "w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm";
export const errorActionSecondary =
  "w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs";
