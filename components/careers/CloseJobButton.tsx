"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Lets the poster stop a job taking applications. */
export default function CloseJobButton({ jobId, title }: { jobId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Close "${title}"? It will stop taking applications and leave the Career Hub.`)) return;
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CLOSE" }) });
          const data = await res.json().catch(() => ({}));
          setBusy(false);
          if (!res.ok) setError(data.error || "Could not close the job.");
          else router.refresh();
        }}
        className="px-3 py-2 min-h-[40px] border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 rounded-xl text-xs font-bold cursor-pointer"
      >
        {busy ? "Closing…" : "Close job"}
      </button>
      {error && <p className="text-[11px] font-bold text-rose-700">{error}</p>}
    </div>
  );
}
