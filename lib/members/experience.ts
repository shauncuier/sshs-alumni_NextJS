import { AppError } from "@/lib/app-error";

/**
 * A member's work experience (stored in AlumniProfile.experience), shown LinkedIn style
 * on the profile. Dates are "YYYY-MM". Safe to import in the browser (profile editor).
 */
export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Self-employed",
  "Business owner",
  "Freelance",
  "Contract",
  "Internship",
  "Government service",
  "Volunteer",
] as const;

export interface ExperienceEntry {
  title: string;
  company: string;
  /** One of EMPLOYMENT_TYPES, or "" when not given. */
  type: string;
  location: string;
  /** "YYYY-MM" */
  start: string;
  /** "YYYY-MM", or "" while current. */
  end: string;
  current: boolean;
  description: string;
}

export const MAX_EXPERIENCE_ENTRIES = 15;
export const EXPERIENCE_LIMITS = { title: 100, company: 120, location: 100, description: 1000 } as const;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2020-01" → "Jan 2020" */
export function monthLabel(ym: string): string {
  const m = MONTH.exec(ym);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

/** "Jan 2020 – Present · 4 yrs 10 mos" (months counted inclusively, as LinkedIn does). */
export function experiencePeriod(e: Pick<ExperienceEntry, "start" | "end" | "current">, now = new Date()): string {
  const s = MONTH.exec(e.start);
  if (!s) return "";
  const endYm = e.current || !e.end ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` : e.end;
  const en = MONTH.exec(endYm);
  const range = `${monthLabel(e.start)} – ${e.current || !e.end ? "Present" : monthLabel(e.end)}`;
  if (!en) return range;
  const months = (Number(en[1]) - Number(s[1])) * 12 + (Number(en[2]) - Number(s[2])) + 1;
  if (months <= 0) return range;
  const y = Math.floor(months / 12);
  const mo = months % 12;
  const parts = [y ? `${y} yr${y === 1 ? "" : "s"}` : "", mo ? `${mo} mo${mo === 1 ? "" : "s"}` : ""].filter(Boolean);
  return `${range} · ${parts.join(" ")}`;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ").slice(0, max) : "");

/** Sort key, newest first: current jobs on top, then by end and start month. */
const order = (e: ExperienceEntry) => `${e.current ? "9" : "0"}${e.end || e.start}${e.start}`;

/** Cleans what a member sent, newest first; throws a 400 with a clear message when an entry is unusable. */
export function normalizeExperience(raw: unknown, now = new Date()): ExperienceEntry[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new AppError("INVALID_EXPERIENCE", 400, "Experience must be a list.");
  if (raw.length > MAX_EXPERIENCE_ENTRIES) throw new AppError("INVALID_EXPERIENCE", 400, `Add at most ${MAX_EXPERIENCE_ENTRIES} positions.`);
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return raw
    .map((item, i): ExperienceEntry | null => {
      const e = (item ?? {}) as Record<string, unknown>;
      const title = text(e.title, EXPERIENCE_LIMITS.title);
      const company = text(e.company, EXPERIENCE_LIMITS.company);
      if (!title && !company && !e.start) return null; // an empty row
      if (!title) throw new AppError("INVALID_EXPERIENCE", 400, `Add the job title for position ${i + 1}.`);
      if (!company) throw new AppError("INVALID_EXPERIENCE", 400, `Add the company or organisation for position ${i + 1}.`);
      const start = typeof e.start === "string" ? e.start : "";
      if (!MONTH.test(start) || start < "1950-01" || start > thisMonth) {
        throw new AppError("INVALID_EXPERIENCE", 400, `Choose a start month (not in the future) for position ${i + 1}.`);
      }
      const current = e.current === true;
      const end = current ? "" : typeof e.end === "string" ? e.end : "";
      if (!current) {
        if (!MONTH.test(end)) throw new AppError("INVALID_EXPERIENCE", 400, `Choose an end month for position ${i + 1}, or tick "I currently work here".`);
        if (end < start) throw new AppError("INVALID_EXPERIENCE", 400, `The end month for position ${i + 1} is before its start month.`);
        if (end > thisMonth) throw new AppError("INVALID_EXPERIENCE", 400, `The end month for position ${i + 1} is in the future.`);
      }
      const type = EMPLOYMENT_TYPES.find((t) => t === e.type) ?? "";
      return {
        title,
        company,
        type,
        location: text(e.location, EXPERIENCE_LIMITS.location),
        start,
        end,
        current,
        description: typeof e.description === "string" ? e.description.trim().slice(0, EXPERIENCE_LIMITS.description) : "",
      };
    })
    .filter((e): e is ExperienceEntry => e !== null)
    .sort((a, b) => order(b).localeCompare(order(a)));
}

/** Stored experience, never throwing (a bad row must not break a profile page). */
export function readExperience(raw: unknown): ExperienceEntry[] {
  try {
    return normalizeExperience(raw);
  } catch {
    return [];
  }
}
