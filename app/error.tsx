"use client"; // Error boundaries must be Client Components

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, RefreshCw, Home } from "lucide-react";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";

// Catches errors in any page below the root layout. It deliberately renders no
// Navbar: a failing shared component may be what brought the page down.
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Server errors reach the browser without their message, so ask the site whether its
  // database is the problem (GET /api/health) and, if so, say that plainly.
  const [dbDown, setDbDown] = useState(false);
  useEffect(() => {
    console.error("Application error:", error);
    let live = true;
    fetch("/api/health", { cache: "no-store" })
      .then((res) => {
        if (live && res.status === 503) setDbDown(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <ErrorScreen
        code={dbDown ? "503" : "500"}
        tone={dbDown ? "amber" : "rose"}
        title={dbDown ? "Back in a few minutes" : "Something went wrong"}
        icon={dbDown ? <Clock className="w-12 h-12" /> : <AlertTriangle className="w-12 h-12" />}
        message={
          dbDown
            ? "কিছুক্ষণের জন্য সমস্যা হচ্ছে। We are fixing a problem with the site's database, so this page cannot load right now. Your data is safe. Please try again in a few minutes."
            : "An unexpected error stopped this page from loading. Please try again; if it keeps happening, contact the alumni committee and quote the reference below."
        }
        reference={dbDown ? undefined : error.digest}
      >
        {/* retry() re-fetches the page before re-rendering, so it also recovers from server errors. */}
        <button type="button" onClick={() => retry()} className={errorActionPrimary}>
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
        <Link href="/" className={errorActionSecondary}>
          <Home className="w-4 h-4 text-slate-400" /> Homepage
        </Link>
      </ErrorScreen>
    </div>
  );
}
