/** A member's gender and whether her photo is shown. Safe to import in the browser. */
import { AppError } from "@/lib/app-error";

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = { MALE: "Male (পুরুষ)", FEMALE: "Female (মহিলা)" };

/** "MALE" or "FEMALE" from a form (any case), null for empty; anything else is a 400. */
export function normalizeGender(raw: unknown): Gender | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const t = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if ((GENDERS as readonly string[]).includes(t)) return t as Gender;
  throw new AppError("INVALID_GENDER", 400, "Please choose Male or Female.");
}

/**
 * Whether other members and visitors see the member's real photo: her own choice when she
 * made one, else hidden for women and shown for everyone else.
 */
export function photoIsPublic(p: { gender?: string | null; isPhotoPublic?: boolean | null }): boolean {
  if (typeof p.isPhotoPublic === "boolean") return p.isPhotoPublic;
  return p.gender !== "FEMALE";
}
