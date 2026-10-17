"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

type Mode = { on: boolean; until: string | null; updatedBy: string | null; hours: number };

/**
 * Admin → Bulk SMS: switch SMS test mode on (verification codes shown on the join form,
 * no SMS sent) or off. It switches itself off after `hours`; see lib/sms-test-mode.ts.
 */
export default function SmsTestModeSwitch() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sms/test-mode", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the SMS setting.");
        setMode(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const toggle = async () => {
    if (!mode) return;
    const next = !mode.on;
    if (next && !window.confirm(`Turn on SMS test mode for ${mode.hours} hours?\n\nNo SMS is sent: anyone joining sees their code on screen, so phone numbers are NOT really checked. Use it only while testing.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sms/test-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change the SMS setting.");
      setMode(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const until = mode?.until
    ? new Date(mode.until).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" })
    : null;

  return (
    <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${mode?.on ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <FlaskConical className={`w-5 h-5 shrink-0 mt-0.5 ${mode?.on ? "text-amber-700" : "text-slate-400"}`} />
        <div className="text-xs">
          <p className="font-bold text-slate-900">
            SMS test mode: <span className={mode?.on ? "text-amber-800" : "text-emerald-800"}>{mode ? (mode.on ? "ON" : "OFF") : "…"}</span>
          </p>
          <p className="text-slate-600 mt-0.5">
            {mode?.on
              ? `Verification codes are shown on the join form instead of texted. Turns itself off ${until}${mode.updatedBy ? ` (turned on by ${mode.updatedBy})` : ""}.`
              : "Verification codes are texted to members. Turn on to try the join form without spending SMS credit."}
          </p>
          {error && <p role="alert" className="mt-1 font-bold text-rose-700">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(mode?.on)}
        aria-label="SMS test mode"
        onClick={() => void toggle()}
        disabled={!mode || busy}
        className={`relative shrink-0 w-14 h-8 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${mode?.on ? "bg-amber-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${mode?.on ? "translate-x-6" : ""}`} />
      </button>
    </div>
  );
}
