/** A member's name in Bangla (নাম বাংলায়), next to the English one. Safe to import in the browser. */
import { AppError } from "@/lib/app-error";

export const BANGLA_NAME_MAX = 120;

/** The trimmed name, null for empty; a name with no Bangla letters is a 400. */
export function normalizeBanglaName(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const t = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!t) return null;
  if (!/[ঀ-৿]/.test(t)) {
    throw new AppError("INVALID_BANGLA_NAME", 400, "Please type your name in Bangla letters (বাংলায় নাম লিখুন), or leave it empty.");
  }
  return t.slice(0, BANGLA_NAME_MAX);
}
