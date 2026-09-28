"use client"; // Error boundaries must be Client Components

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";
import "./globals.css";

// Shown when the root layout itself fails. It replaces the whole document, so it
// renders its own <html> and <body> and imports the global styles itself.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-[#f8fafc] min-h-screen flex items-center justify-center p-6">
        {/* metadata exports are not supported here; React's <title> is. */}
        <title>Something went wrong | SSGHS Alumni Association</title>
        <ErrorScreen
          code="500"
          tone="rose"
          title="The portal could not load"
          icon={<AlertTriangle className="w-12 h-12" />}
          message="Something went wrong while loading the alumni portal. Please try again in a moment."
          reference={error.digest}
        >
          <button type="button" onClick={() => retry()} className={errorActionPrimary}>
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          {/* A plain link forces a full page load, which the root layout needs to recover. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={errorActionSecondary}>
            Homepage
          </a>
        </ErrorScreen>
      </body>
    </html>
  );
}
