"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup } from "lucide-react";

type LastRun = { at: string; ran: boolean; full: boolean; written: number; deleted: number; ms: number; reason?: string; failed: { table: string; error: string }[] };
type State = {
  minutes: number;
  choices: number[];
  updatedAt: string | null;
  updatedBy: string | null;
  configured: boolean;
  mode: "primary" | "standby";
  lastRun: LastRun | null;
};

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString();
}

/** Admin → Settings → Database: how often the standby copy runs (lib/standby-sync-setting.ts) and how the last one went. */
export default function StandbySyncSettings() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/standby-sync", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the database settings.");
        setState(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const choose = async (minutes: number) => {
    if (!state || minutes === state.minutes) return;
    setBusy(minutes);
    setError(null);
    try {
      const res = await fetch("/api/admin/standby-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change the setting.");
      setState(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const run = state?.lastRun;
  const runFailed = run && (!run.ran || run.failed.length > 0);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-sm font-black text-slate-900">Standby copy of the database</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          If the main database stops working, the site switches to this copy by itself: members can still browse, and saving waits until the
          main database is back. The copy never holds passwords or the sign-in log.
        </p>
      </div>

      {state && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
            !state.configured ? "bg-slate-50 border-slate-200" : state.mode === "standby" ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-200"
          }`}
        >
          {state.mode === "standby" ? (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          ) : state.configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <DatabaseBackup className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <div className="space-y-1">
            <p className="font-bold text-slate-900">
              {!state.configured
                ? "Off: no standby database is set on the server."
                : state.mode === "standby"
                  ? "The main database is unavailable: the site is reading the standby copy now, and saving is paused."
                  : `On: what changed is copied every ${state.minutes} minutes.`}
            </p>
            {!state.configured && <p className="text-slate-600">The interval below applies once the server has STANDBY_DATABASE_URL (docs/PRODUCTION_ENV.md).</p>}
            {run && (
              <p className={runFailed ? "text-rose-700 font-semibold" : "text-slate-600"}>
                Last copy {ago(run.at)}
                {run.ran
                  ? `: ${run.written} row${run.written === 1 ? "" : "s"} changed, ${run.deleted} removed${run.full ? " (full copy)" : ""}, ${(run.ms / 1000).toFixed(1)} s.`
                  : `: failed (${run.reason ?? "unknown error"}).`}
                {run.failed.length > 0 && ` Failed tables: ${run.failed.map((f) => f.table).join(", ")}.`}
              </p>
            )}
            {state.configured && !run && <p className="text-slate-600">No copy has run yet; the first one starts about a minute and a half after the site starts.</p>}
          </div>
        </div>
      )}

      <fieldset>
        <legend className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500" /> Copy every
        </legend>
        <div role="radiogroup" aria-label="Copy every" className="mt-2 flex flex-wrap gap-2">
          {(state?.choices ?? [2, 5, 10, 15, 30]).map((m) => {
            const selected = state?.minutes === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!state || busy !== null}
                onClick={() => void choose(m)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-bold transition-colors disabled:opacity-60 ${
                  selected ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-emerald-600"
                }`}
              >
                {busy === m ? "Saving…" : `${m} min${m === 5 ? " (recommended)" : ""}`}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Shorter keeps the copy fresher if the main database fails; each copy also makes the main database do a little work, so very short
          times can slow the site. A full copy also runs every night at 2 am.
          {state?.updatedBy && ` Last changed by ${state.updatedBy}.`}
        </p>
      </fieldset>

      {error && (
        <p role="alert" className="text-xs font-bold text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
