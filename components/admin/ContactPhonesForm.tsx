"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { CONTACT_NAME_MAX, MAX_CONTACT_PHONES, type ContactPhone } from "@/lib/contact-phones-shared";

type Setting = { phones: ContactPhone[]; updatedAt: string | null; updatedBy: string | null };
type Row = { number: string; name: string };

const toRows = (phones: ContactPhone[]): Row[] => phones.map((p) => ({ number: p.number, name: p.name ?? "" }));

/**
 * Admin → Settings: the association's contact numbers shown in the footer and on the
 * contact page, in order, each with an optional name. See lib/contact-phones.ts.
 */
export default function ContactPhonesForm() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/contact-phones", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the contact numbers.");
        setSetting(body);
        setRows(toRows(body.phones));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const change = (i: number, field: keyof Row, value: string) => {
    setSaved(false);
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };
  const move = (i: number, by: -1 | 1) => {
    setSaved(false);
    setRows((r) => {
      const next = [...r];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  };
  const remove = (i: number) => {
    setSaved(false);
    setRows((r) => r.filter((_, j) => j !== i));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/contact-phones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: rows.map((r) => ({ number: r.number, name: r.name || null })) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save the contact numbers.");
      setSetting(body);
      setRows(toRows(body.phones));
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
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={row.number}
              onChange={(e) => change(i, "number", e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
              aria-label={`Number ${i + 1}`}
              className="sm:w-48 px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
            <input
              value={row.name}
              onChange={(e) => change(i, "name", e.target.value)}
              placeholder="Name (e.g. General Secretary)"
              maxLength={CONTACT_NAME_MAX}
              aria-label={`Name for number ${i + 1}`}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ArrowUp className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ArrowDown className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remove(i)} disabled={rows.length === 1} aria-label="Remove" className="p-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      {saved && !error && <p className="text-xs font-semibold text-emerald-700">Saved. The site shows the new numbers within a minute.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setRows((r) => [...r, { number: "", name: "" }]);
          }}
          disabled={rows.length >= MAX_CONTACT_PHONES}
          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add number
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
