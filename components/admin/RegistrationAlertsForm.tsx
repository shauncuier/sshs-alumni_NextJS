"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

type Setting = { emails: string[]; updatedAt: string | null; updatedBy: string | null };

const MAX = 5; // lib/registration-alerts.ts MAX_ALERT_EMAILS

/**
 * Admin → Settings → Email: who is emailed when someone registers on the site.
 * Removing every address turns the alerts off. See lib/registration-alerts.ts.
 */
export default function RegistrationAlertsForm() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [rows, setRows] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/registration-alerts", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the alert addresses.");
        setSetting(body);
        setRows(body.emails);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const edit = (next: string[]) => {
    setSaved(false);
    setRows(next);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/registration-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: rows }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save the alert addresses.");
      setSetting(body);
      setRows(body.emails);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!setting) {
    return <div className="p-4 rounded-2xl border border-slate-200 bg-white text-xs text-slate-500">{error ?? "Loading…"}</div>;
  }

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
      <div>
        <p className="text-sm font-bold text-slate-900">New registration alerts</p>
        <p className="text-xs text-slate-500">
          These addresses get an email each time someone joins or registers for an event on the website. Paper forms are not sent. Remove every address to stop the alerts.
        </p>
      </div>
      <div className="space-y-2">
        {rows.map((email, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="email"
              value={email}
              onChange={(e) => edit(rows.map((r, j) => (j === i ? e.target.value : r)))}
              placeholder="name@example.com"
              aria-label={`Alert address ${i + 1}`}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
            <button type="button" onClick={() => edit(rows.filter((_, j) => j !== i))} aria-label="Remove" className="p-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs font-semibold text-amber-700">Alerts are off: nobody is emailed about new registrations.</p>}
      </div>

      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {saved && !error && <p className="text-xs font-semibold text-emerald-700">Saved.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => edit([...rows, ""])}
          disabled={rows.length >= MAX}
          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add address
        </button>
        <button type="button" onClick={save} disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 disabled:opacity-50 flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" /> {busy ? "Saving…" : "Save"}
        </button>
        {setting.updatedBy && (
          <span className="text-[11px] text-slate-400">
            Last changed by {setting.updatedBy}
            {setting.updatedAt && ` on ${new Date(setting.updatedAt).toLocaleDateString("en-GB")}`}
          </span>
        )}
      </div>
    </div>
  );
}
