"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

// Chromium's install prompt event (not in the standard DOM typings).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_BANNER_AUTO_HIDE_MS = 6000;
const INSTALL_BANNER_LAST_SHOWN_KEY = "ssghs:install-banner-last-shown";

// Local calendar day, so the banner can appear at most once per day.
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Storage can be unavailable (private mode, blocked site data); treat that as "not shown yet".
function installBannerShownToday(): boolean {
  try {
    return localStorage.getItem(INSTALL_BANNER_LAST_SHOWN_KEY) === todayKey();
  } catch {
    return false;
  }
}

function markInstallBannerShown(): void {
  try {
    localStorage.setItem(INSTALL_BANNER_LAST_SHOWN_KEY, todayKey());
  } catch {
    // Ignore: without storage the banner may reappear on the next visit.
  }
}

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  // Hovering or focusing the banner pauses the auto-hide so it can still be used.
  const [installBannerPaused, setInstallBannerPaused] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setShowOfflineBanner(false);
    };

    const handleOffline = () => {
      setShowOfflineBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (installBannerShownToday()) return;
      markInstallBannerShown();
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Hide the install banner a few seconds after it appears, unless it is being used.
  useEffect(() => {
    if (!showInstallBanner || installBannerPaused) return;
    const timer = setTimeout(() => setShowInstallBanner(false), INSTALL_BANNER_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [showInstallBanner, installBannerPaused]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Campus Offline Mode Active — Cached directories and digital smart cards remain fully accessible.</span>
          </div>
          <button
            onClick={() => setShowOfflineBanner(false)}
            className="p-1 hover:bg-amber-600/30 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div
          onMouseEnter={() => setInstallBannerPaused(true)}
          onMouseLeave={() => setInstallBannerPaused(false)}
          onFocus={() => setInstallBannerPaused(true)}
          onBlur={() => setInstallBannerPaused(false)}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#06281e] text-white p-4 rounded-2xl border border-emerald-700 shadow-2xl flex items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SSGHS" className="w-9 h-9 rounded-xl object-contain bg-white p-0.5" />
            <div>
              <h4 className="font-bold text-xs">Install SSGHS Alumni App</h4>
              <p className="text-[11px] text-emerald-200">Fast access to your Smart ID &amp; Directory</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              aria-label="Dismiss install banner"
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
