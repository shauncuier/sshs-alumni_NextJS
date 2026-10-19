import { AppError } from "@/lib/app-error";

/**
 * A member's education after SSC (stored in AlumniProfile.education), shown LinkedIn
 * style on the profile. SSC itself is the profile's batch, roll and section. Safe to
 * import in the browser (profile editor).
 */
export const EDUCATION_LEVELS = [
  { key: "HSC", en: "HSC", bn: "এইচএসসি" },
  { key: "DIPLOMA", en: "Diploma", bn: "ডিপ্লোমা" },
  { key: "BACHELOR", en: "Bachelor's / Honours", bn: "স্নাতক / অনার্স" },
  { key: "MBBS", en: "MBBS / BDS", bn: "এমবিবিএস / বিডিএস" },
  { key: "MASTERS", en: "Master's", bn: "স্নাতকোত্তর" },
  { key: "MPHIL", en: "MPhil", bn: "এমফিল" },
  { key: "MPH", en: "MPH", bn: "এমপিএইচ" },
  { key: "PHD", en: "PhD", bn: "পিএইচডি" },
  { key: "POSTDOC", en: "Postdoctoral", bn: "পোস্টডক্টরাল" },
  { key: "PROFESSIONAL", en: "Professional (CA, FCPS, LLB, …)", bn: "পেশাগত ডিগ্রি" },
  { key: "OTHER", en: "Other", bn: "অন্যান্য" },
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["key"];

export interface EducationEntry {
  /** School, college or university. */
  institution: string;
  /** Degree level. */
  level: EducationLevel;
  /** Field of study or group (e.g. Science, Public Health). */
  subject: string;
  startYear: number | null;
  /** Passing year, or the expected one; null while ongoing or not given. */
  endYear: number | null;
  grade: string;
  description: string;
}

export const MAX_EDUCATION_ENTRIES = 10;
export const EDUCATION_LIMITS = { institution: 150, subject: 100, grade: 40, description: 500 } as const;

export function educationLabel(level: string): string {
  return EDUCATION_LEVELS.find((l) => l.key === level)?.en ?? level;
}

/** "2015 – 2019", "2021 – present", "2019" or "". */
export function educationYears(e: Pick<EducationEntry, "startYear" | "endYear">, now = new Date()): string {
  if (e.startYear && e.endYear) return e.startYear === e.endYear ? String(e.endYear) : `${e.startYear} – ${e.endYear}`;
  if (e.startYear) return e.startYear <= now.getFullYear() ? `${e.startYear} – present` : String(e.startYear);
  return e.endYear ? String(e.endYear) : "";
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ").slice(0, max) : "");

function yearOf(v: unknown, label: string, i: number, maxYear: number): number | null {
  if (v === undefined || v === null || v === "") return null;
  const y = Number(v);
  if (!Number.isInteger(y) || y < 1950 || y > maxYear) {
    throw new AppError("INVALID_EDUCATION", 400, `The ${label} for education entry ${i + 1} must be between 1950 and ${maxYear}.`);
  }
  return y;
}

/** Sort key, newest first: still studying (a start year, no end) on top, entries without years last. */
const order = (e: EducationEntry) => e.endYear ?? (e.startYear ? 9998 : 0);

/** Cleans what a member sent, newest first; throws a 400 with a clear message when an entry is unusable. */
export function normalizeEducation(raw: unknown, now = new Date()): EducationEntry[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new AppError("INVALID_EDUCATION", 400, "Education must be a list.");
  if (raw.length > MAX_EDUCATION_ENTRIES) throw new AppError("INVALID_EDUCATION", 400, `Add at most ${MAX_EDUCATION_ENTRIES} education entries.`);
  const maxYear = now.getFullYear() + 6;
  return raw
    .map((item, i): EducationEntry | null => {
      const e = (item ?? {}) as Record<string, unknown>;
      const level = EDUCATION_LEVELS.find((l) => l.key === e.level)?.key;
      const institution = text(e.institution, EDUCATION_LIMITS.institution);
      const subject = text(e.subject, EDUCATION_LIMITS.subject);
      if (!level && !institution && !subject && !e.year && !e.startYear && !e.endYear) return null; // an empty row
      if (!institution) throw new AppError("INVALID_EDUCATION", 400, `Add the school or university for education entry ${i + 1}.`);
      if (!level) throw new AppError("INVALID_EDUCATION", 400, `Choose the degree for education entry ${i + 1}.`);
      const startYear = yearOf(e.startYear, "start year", i, maxYear);
      // Older entries had one "year": the passing year.
      const endYear = yearOf(e.endYear ?? e.year, "end year", i, maxYear);
      if (startYear && endYear && startYear > endYear) {
        throw new AppError("INVALID_EDUCATION", 400, `The start year for education entry ${i + 1} is after its end year.`);
      }
      return {
        institution,
        level,
        subject,
        startYear,
        endYear,
        grade: text(e.grade, EDUCATION_LIMITS.grade),
        description: typeof e.description === "string" ? e.description.trim().slice(0, EDUCATION_LIMITS.description) : "",
      };
    })
    .filter((e): e is EducationEntry => e !== null)
    .sort((a, b) => order(b) - order(a));
}

/** Stored education, never throwing (a bad row must not break a profile page). */
export function readEducation(raw: unknown): EducationEntry[] {
  try {
    return normalizeEducation(raw);
  } catch {
    return [];
  }
}
