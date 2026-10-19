"use client";

import { useState } from "react";
import { GraduationCap, Pencil, Plus, School, Trash2, X } from "lucide-react";
import { useEscapeKey } from "@/components/shared/useEscapeKey";
import {
  EDUCATION_LEVELS,
  EDUCATION_LIMITS,
  MAX_EDUCATION_ENTRIES,
  educationLabel,
  educationYears,
  type EducationEntry,
} from "@/lib/members/education";

/**
 * Education, LinkedIn style: each school with its degree, field, years, grade and a short
 * description, newest first, then SSC at Sabuj Shikshayatan. With `editable`, a + adds
 * an entry and a pencil edits one in a dialog; each change is saved at once.
 */
export default function EducationSection({
  initial,
  sscBatch,
  sscDetail,
  editable = false,
}: {
  initial: EducationEntry[];
  sscBatch: number;
  /** e.g. "Section: Science · Roll: 42" */
  sscDetail?: string;
  editable?: boolean;
}) {
  const [entries, setEntries] = useState<EducationEntry[]>(initial);
  const [editing, setEditing] = useState<{ index: number | null; entry: EducationEntry } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (next: EducationEntry[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save your education.");
      setEntries(Array.isArray(body.profile?.education) ? body.profile.education : next);
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const blank: EducationEntry = { institution: "", level: "BACHELOR", subject: "", startYear: null, endYear: null, grade: "", description: "" };

  return (
    <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-700" /> Education
        </h3>
        {editable && entries.length < MAX_EDUCATION_ENTRIES && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing({ index: null, entry: blank });
            }}
            aria-label="Add education"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {entries.map((e, i) => (
          <li key={`${e.institution}-${i}`} className="flex gap-3 py-4">
            <div className="w-12 h-12 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <School className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-slate-900 leading-snug">{e.institution}</p>
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEditing({ index: i, entry: e });
                    }}
                    aria-label={`Edit ${e.institution}`}
                    className="w-8 h-8 -mt-1 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-800">
                {educationLabel(e.level)}
                {e.subject ? `, ${e.subject}` : ""}
              </p>
              {educationYears(e) && <p className="text-xs text-slate-500 mt-0.5">{educationYears(e)}</p>}
              {e.grade && <p className="text-xs text-slate-700 mt-1">Grade: {e.grade}</p>}
              {e.description && <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed">{e.description}</p>}
            </div>
          </li>
        ))}
        <li className="flex gap-3 py-4">
          <img src="/logo.png" alt="" className="w-12 h-12 shrink-0 rounded-lg border border-slate-200 bg-white p-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 leading-snug">Sabuj Shikshayatan Government High School</p>
            <p className="text-xs text-slate-800">SSC</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {sscBatch ? `Batch ${sscBatch}` : ""}
              {sscDetail ? ` · ${sscDetail}` : ""}
            </p>
          </div>
        </li>
      </ul>
      {editable && entries.length === 0 && (
        <p className="text-xs text-slate-500">Add your HSC, Honours, Master&apos;s, MPhil, MPH or PhD with the + button.</p>
      )}
      {error && !editing && <p role="alert" className="text-xs font-bold text-rose-700 mt-2">{error}</p>}

      {editing && (
        <EducationDialog
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
            if (!window.confirm(`Remove ${editing.entry.institution} from your education?`)) return;
            void save(entries.filter((_, j) => j !== editing.index));
          }}
        />
      )}
    </section>
  );
}

const field = "w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none";
const label = "block text-xs font-semibold text-slate-700 mb-1";

function EducationDialog({
  entry,
  isNew,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  entry: EducationEntry;
  isNew: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (entry: EducationEntry) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    ...entry,
    startYear: entry.startYear ? String(entry.startYear) : "",
    endYear: entry.endYear ? String(entry.endYear) : "",
  });
  useEscapeKey(true, onClose);
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const year = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edu-dialog-title"
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 id="edu-dialog-title" className="font-bold text-lg text-slate-900">
            {isNew ? "Add education" : "Edit education"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          className="px-5 py-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...form,
              startYear: form.startYear ? Number(form.startYear) : null,
              endYear: form.endYear ? Number(form.endYear) : null,
            });
          }}
        >
          <div>
            <label htmlFor="edu-institution" className={label}>School / college / university *</label>
            <input id="edu-institution" required maxLength={EDUCATION_LIMITS.institution} className={field} value={form.institution} placeholder="e.g. University of Chittagong" onChange={(e) => set({ institution: e.target.value })} />
          </div>
          <div>
            <label htmlFor="edu-level" className={label}>Degree *</label>
            <select id="edu-level" required className={field} value={form.level} onChange={(e) => set({ level: e.target.value as EducationEntry["level"] })}>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.en} · {l.bn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edu-subject" className={label}>Field of study / group</label>
            <input id="edu-subject" maxLength={EDUCATION_LIMITS.subject} className={field} value={form.subject} placeholder="e.g. Science, Economics, Public Health" onChange={(e) => set({ subject: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edu-start" className={label}>Start year</label>
              <input id="edu-start" inputMode="numeric" className={field} value={form.startYear} placeholder="2015" onChange={(e) => set({ startYear: year(e.target.value) })} />
            </div>
            <div>
              <label htmlFor="edu-end" className={label}>End year (or expected)</label>
              <input id="edu-end" inputMode="numeric" className={field} value={form.endYear} placeholder="2019" onChange={(e) => set({ endYear: year(e.target.value) })} />
            </div>
          </div>
          <div>
            <label htmlFor="edu-grade" className={label}>Grade / result</label>
            <input id="edu-grade" maxLength={EDUCATION_LIMITS.grade} className={field} value={form.grade} placeholder="e.g. GPA 5.00, CGPA 3.75, First class" onChange={(e) => set({ grade: e.target.value })} />
          </div>
          <div>
            <label htmlFor="edu-desc" className={label}>Description</label>
            <textarea id="edu-desc" rows={3} maxLength={EDUCATION_LIMITS.description} className={field} value={form.description} placeholder="Thesis, awards, activities…" onChange={(e) => set({ description: e.target.value })} />
            <p className="text-[11px] text-slate-400 text-right">{form.description.length}/{EDUCATION_LIMITS.description}</p>
          </div>
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
