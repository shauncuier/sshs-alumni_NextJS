"use client";

import { RefreshCw } from "lucide-react";
import { errorActionPrimary } from "@/components/shared/ErrorScreen";

// Reloads the page the visitor was trying to open once they are back online.
export default function RetryButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className={errorActionPrimary}>
      <RefreshCw className="w-4 h-4" /> Try Again
    </button>
  );
}
