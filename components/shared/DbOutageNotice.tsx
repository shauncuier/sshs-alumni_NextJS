"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * A small notice while the database has a problem (GET /api/health, lib/db-mode.ts):
 * - on the standby copy: pages work, saving is paused;
 * - with no database at all: pages show their last saved copy (lib/last-good.ts).
 * Asks at most once a minute per tab; shows nothing when all is well or the check fails.
 */
type Health = { ok: boolean; mode?: "primary" | "standby"; standbyOk?: boolean };

const KEY = "db-health";
const EVERY_MS = 60_000;

function cached(): Health | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { at, health } = JSON.parse(raw) as { at: number; health: Health };
    return Date.now() - at < EVERY_MS ? health : null;
  } catch {
    return null;
  }
}

function remember(health: Health) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), health }));
  } catch {
    // Private mode: ask again next time.
  }
}

export default function DbOutageNotice() {
  const [health, setHealth] = useState<Health | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let live = true;
    const check = async () => {
      const known = cached();
      if (known) {
        if (live) setHealth(known);
        return;
      }
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const body = (await res.json()) as Health;
        remember(body);
        if (live) setHealth(body);
      } catch {
        // Offline or the server is down: the page itself says so.
      }
    };
    void check();
    const timer = setInterval(check, EVERY_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (!health || health.ok || closed) return null;
  // "Browse as usual" only while the standby copy actually answers.
  const standby = health.mode === "standby" && health.standbyOk !== false;

  return (
    <div role="status" className="print:hidden fixed inset-x-0 bottom-3 z-[70] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
        <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <div className="space-y-0.5">
          <p lang="bn" className="font-semibold">
            {standby ? "কিছুক্ষণের জন্য নতুন তথ্য সংরক্ষণ বন্ধ আছে।" : "কিছু তথ্য একটু পুরনো হতে পারে।"}
          </p>
          <p>
            {standby
              ? "We are fixing a database problem. You can browse as usual; saving, payments and sign-ups are paused for a few minutes."
              : "We are fixing a database problem. Some information may be a little out of date, and signing in may not work for a few minutes."}
          </p>
        </div>
        <button type="button" onClick={() => setClosed(true)} className="ml-1 rounded p-1 text-amber-800 hover:bg-amber-100" aria-label="Hide this notice">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
