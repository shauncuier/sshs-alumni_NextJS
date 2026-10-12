"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const input = "w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600";

async function patch(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/mentorship/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
}

/** The mentor's Accept / Decline controls for one pending request. */
export function MentorResponse({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"accept" | "decline" | null>(null);
  const [meetingDetails, setMeetingDetails] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await patch(requestId, mode === "accept" ? { action: "ACCEPT", meetingDetails, reply } : { action: "DECLINE", reply });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("accept")} className="px-4 py-2 min-h-[40px] bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer">Accept</button>
        <button type="button" onClick={() => setMode("decline")} className="px-4 py-2 min-h-[40px] border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Decline</button>
      </div>
    );
  }
  return (
    <div className="space-y-2 bg-slate-50 rounded-2xl p-3 border border-slate-200">
      {mode === "accept" && (
        <div>
          <label htmlFor={`md-${requestId}`} className="block text-xs font-semibold text-slate-700 mb-1">How and when will you meet? *</label>
          <input id={`md-${requestId}`} maxLength={500} className={input} value={meetingDetails} onChange={(e) => setMeetingDetails(e.target.value)} placeholder="e.g. Google Meet link, or call me on 017… Friday 8 pm" />
        </div>
      )}
      <div>
        <label htmlFor={`rp-${requestId}`} className="block text-xs font-semibold text-slate-700 mb-1">Message (optional)</label>
        <textarea id={`rp-${requestId}`} rows={2} maxLength={2000} className={input} value={reply} onChange={(e) => setReply(e.target.value)} />
      </div>
      {error && <p className="text-[11px] font-bold text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || (mode === "accept" && meetingDetails.trim().length < 5)} onClick={() => void submit()} className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white disabled:opacity-50 cursor-pointer ${mode === "accept" ? "bg-emerald-800" : "bg-rose-700"}`}>
          {busy ? "Sending…" : mode === "accept" ? "Accept & email them" : "Decline & email them"}
        </button>
        <button type="button" disabled={busy} onClick={() => setMode(null)} className="px-4 py-2 min-h-[40px] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">Back</button>
      </div>
    </div>
  );
}

/** The mentee's Cancel button for a pending request. */
export function CancelRequest({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Cancel this request?")) return;
        setBusy(true);
        try {
          await patch(requestId, { action: "CANCEL" });
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
      className="px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer disabled:opacity-50"
    >
      Cancel request
    </button>
    {error && <span role="alert" className="text-[11px] font-bold text-rose-700">{error}</span>}
    </span>
  );
}
