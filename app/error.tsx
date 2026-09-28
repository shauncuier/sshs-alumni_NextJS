"use client"; // Error boundaries must be Client Components

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
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
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <ErrorScreen
        code="500"
        tone="rose"
        title="Something went wrong"
        icon={<AlertTriangle className="w-12 h-12" />}
        message="An unexpected error stopped this page from loading. Please try again; if it keeps happening, contact the alumni committee and quote the reference below."
        reference={error.digest}
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
