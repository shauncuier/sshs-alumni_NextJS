/** Blood groups a member may give (optional). Safe to import in the browser. */
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

/**
 * A known blood group from what a form sent ("ab +", "O−", "o pos" → "AB+", "O-", "O+"),
 * null for empty, undefined for anything unusable (the caller decides whether that is an error).
 */
export function normalizeBloodGroup(raw: unknown): BloodGroup | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return undefined;
  const t = raw
    .toUpperCase()
    .replace(/[−–]/g, "-") // minus sign and en dash
    .replace(/\s*(POSITIVE|POS|\+VE)\s*$/, "+")
    .replace(/\s*(NEGATIVE|NEG|-VE)\s*$/, "-")
    .replace(/\s+/g, "");
  if (!t) return null;
  return (BLOOD_GROUPS as readonly string[]).includes(t) ? (t as BloodGroup) : undefined;
}
