"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

export type ToastState = { text: string; tone: "ok" | "error" } | null;

/** A short message after an admin action; errors stay longer and show in red. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<number | undefined>(undefined);
  const showToast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    window.clearTimeout(timer.current);
    setToast({ text, tone });
    timer.current = window.setTimeout(() => setToast(null), tone === "error" ? 6000 : 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, showToast };
}

// Sits above the admin bottom bar on phones.
export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  const error = toast.tone === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
        error ? "bg-rose-700 text-white border-rose-800" : "bg-slate-900 text-white border-slate-700"
      }`}
    >
      {error ? <AlertTriangle className="w-4 h-4 shrink-0 text-rose-100" /> : <Check className="w-4 h-4 shrink-0 text-emerald-400" />}
      <span>{toast.text}</span>
    </div>
  );
}
