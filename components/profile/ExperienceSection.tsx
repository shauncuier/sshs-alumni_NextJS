"use client";

import { useState } from "react";
import { Briefcase, Building2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEscapeKey } from "@/components/shared/useEscapeKey";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LIMITS,
  MAX_EXPERIENCE_ENTRIES,
  experiencePeriod,
  type ExperienceEntry,
} from "@/lib/members/experience";

/** What the profile looks like after a save (designation and company follow the current job). */
export type SavedProfile = { designation?: string | null; company?: string | null; experience?: unknown };

/**
 * Work experience, LinkedIn style: title, company and type, dates with the duration,
 * location and a description, newest first. With `editable`, a + adds a position and a
 * pencil edits one in a dialog; each change is saved at once. Without positions, the
 * profile's own profession and company are shown as the current role.
 */
export default function ExperienceSection({
  initial,
  fallbackTitle,
  fallbackCompany,
  editable = false,
  onSaved,
}: {
  initial: ExperienceEntry[];
  fallbackTitle?: string | null;
  fallbackCompany?: string | null;
  editable?: boolean;
  onSaved?: (profile: SavedProfile) => void;
}) {
  const [entries, setEntries] = useState<ExperienceEntry[]>(initial);
  const [editing, setEditing] = useState<{ index: number | null; entry: ExperienceEntry } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (next: ExperienceEntry[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save your experience.");
      setEntries(Array.isArray(body.profile?.experience) ? body.profile.experience : next);
      onSaved?.(body.profile ?? {});
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const blank: ExperienceEntry = { title: "", company: "", type: "Full-time", location: "", start: "", end: "", current: false, description: "" };
  const showFallback = entries.length === 0 && Boolean(fallbackTitle && fallbackTitle !== "Alumnus");

  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-700" /> Experience
        </h3>
        {editable && entries.length < MAX_EXPERIENCE_ENTRIES && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing({ index: null, entry: blank });
            }}
            aria-label="Add experience"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {entries.map((e, i) => (
          <li key={`${e.company}-${e.start}-${i}`} className="flex gap-3 py-4">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-slate-900 leading-snug">{e.title}</p>
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEditing({ index: i, entry: e });
                    }}
                    aria-label={`Edit ${e.title} at ${e.company}`}
                    className="w-8 h-8 -mt-1 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-800">
                {e.company}
                {e.type ? ` · ${e.type}` : ""}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{experiencePeriod(e)}</p>
              {e.location && <p className="text-xs text-slate-500">{e.location}</p>}
              {e.description && <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed">{e.description}</p>}
            </div>
          </li>
        ))}
        {showFallback && (
          <li className="flex gap-3 py-4">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">{fallbackTitle}</p>
              {fallbackCompany && <p className="text-xs text-slate-800">{fallbackCompany}</p>}
              <p className="text-xs text-slate-500 mt-0.5">Current role</p>
            </div>
          </li>
        )}
      </ul>
      {entries.length === 0 && !showFallback && (
        <p className="text-xs text-slate-500">{editable ? "Add your jobs and roles with the + button." : "No experience added yet."}</p>
      )}
      {error && !editing && <p role="alert" className="text-xs font-bold text-rose-700 mt-2">{error}</p>}

      {editing && (
        <ExperienceDialog
          entry={editing.entry}
          isNew={editing.index === null}
          saving={saving}
          error={error}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            const next = editing.index === null ? [...entries, entry] : entries.map((x, j) => (j === editing.index ? entry : x));
            void save(next);
          }}
          onDelete={() => {
            if (editing.index === null) return;
            if (!window.confirm(`Remove ${editing.entry.title} at ${editing.entry.company}?`)) return;
            void save(entries.filter((_, j) => j !== editing.index));
          }}
        />
      )}
    </section>
  );
}

const field = "w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none";
const label = "block text-xs font-semibold text-slate-700 mb-1";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Month and year dropdowns ("YYYY-MM"), which every phone browser supports. */
function MonthYear({ id, value, onChange, disabled = false }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [y, m] = value ? value.split("-") : ["", ""];
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1959 }, (_, i) => String(thisYear - i));
  const set = (year: string, month: string) => onChange(year && month ? `${year}-${month}` : year || month ? `${year}-${month}` : "");
  return (
    <div className="grid grid-cols-2 gap-2">
      <select id={id} aria-label="Month" disabled={disabled} className={field} value={m ?? ""} onChange={(e) => set(y ?? "", e.target.value)}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, "0")}>
            {name}
          </option>
        ))}
      </select>
      <select aria-label="Year" disabled={disabled} className={field} value={y ?? ""} onChange={(e) => set(e.target.value, m ?? "")}>
        <option value="">Year</option>
        {years.map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>
    </div>
  );
}

function ExperienceDialog({
  entry,
  isNew,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  entry: ExperienceEntry;
  isNew: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (entry: ExperienceEntry) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<ExperienceEntry>(entry);
  useEscapeKey(true, onClose);
  const set = (patch: Partial<ExperienceEntry>) => setForm({ ...form, ...patch });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exp-dialog-title"
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 id="exp-dialog-title" className="font-bold text-lg text-slate-900">
            {isNew ? "Add experience" : "Edit experience"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="px-5 py-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, end: form.current ? "" : form.end });
          }}
        >
          <div>
            <label htmlFor="exp-title" className={label}>Title *</label>
            <input id="exp-title" required maxLength={EXPERIENCE_LIMITS.title} className={field} value={form.title} placeholder="e.g. Senior Software Engineer, Assistant Professor" onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="exp-company" className={label}>Company or organisation *</label>
            <input id="exp-company" required maxLength={EXPERIENCE_LIMITS.company} className={field} value={form.company} placeholder="e.g. Grameenphone, Chittagong Medical College Hospital" onChange={(e) => set({ company: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-type" className={label}>Employment type</label>
              <select id="exp-type" className={field} value={form.type} onChange={(e) => set({ type: e.target.value })}>
                <option value="">—</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exp-location" className={label}>Location</label>
              <input id="exp-location" maxLength={EXPERIENCE_LIMITS.location} className={field} value={form.location} placeholder="e.g. Dhaka" onChange={(e) => set({ location: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-emerald-700" checked={form.current} onChange={(e) => set({ current: e.target.checked })} />
            I currently work here
          </label>
          <div>
            <label htmlFor="exp-start" className={label}>Start date *</label>
            <MonthYear id="exp-start" value={form.start} onChange={(start) => set({ start })} />
          </div>
          {!form.current && (
            <div>
              <label htmlFor="exp-end" className={label}>End date *</label>
              <MonthYear id="exp-end" value={form.end} onChange={(end) => set({ end })} />
            </div>
          )}
          <div>
            <label htmlFor="exp-desc" className={label}>Description</label>
            <textarea id="exp-desc" rows={4} maxLength={EXPERIENCE_LIMITS.description} className={field} value={form.description} placeholder="What you do or did there, achievements…" onChange={(e) => set({ description: e.target.value })} />
            <p className="text-[11px] text-slate-400 text-right">
              {form.description.length}/{EXPERIENCE_LIMITS.description}
            </p>
          </div>
          {form.current && <p className="text-[11px] text-slate-500">Your current job also becomes the designation and company shown on your profile and in the directory.</p>}
          {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {!isNew ? (
              <button type="button" onClick={onDelete} disabled={saving} className="text-sm font-bold text-rose-700 hover:underline flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={saving} className="min-h-[44px] px-6 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
