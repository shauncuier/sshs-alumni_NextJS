// Documents a new member can upload to show they studied at SSGHS.
// Browser-safe: used by the join form, the admin views and the server.

export const PROOF_TYPES = [
  { value: "SSC_CERTIFICATE", label: "SSC certificate (এসএসসি সনদ)" },
  { value: "SCHOOL_TESTIMONIAL", label: "Testimonial (প্রশংসাপত্র)" },
  { value: "SSC_MARKSHEET", label: "SSC marksheet (মার্কশিট)" },
] as const;

/** Types accepted before the list was cut to three; requests already stored may still use them. */
const LEGACY_LABELS: Record<string, string> = {
  SSC_ADMIT_OR_REGISTRATION: "SSC admit or registration card",
  SCHOOL_ID_CARD: "Old school ID card",
  OTHER: "Other",
};

export type ProofType = (typeof PROOF_TYPES)[number]["value"];

/** An optional note about the document, up to this many characters. */
export const PROOF_NOTE_MAX = 200;

/** Proof files: JPEG, PNG or WebP image, or PDF, at most 10 MB. */
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function isProofType(value: unknown): value is ProofType {
  return PROOF_TYPES.some((t) => t.value === value);
}

/** The label for a stored type; unknown values are shown as they are. */
export function proofTypeLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PROOF_TYPES.find((t) => t.value === value)?.label ?? LEGACY_LABELS[value] ?? value;
}

/** What the admin views show about a member's proof (the file URL is null once deleted). */
export interface ProofSummary {
  type: string;
  note: string | null;
  fileUrl: string | null;
  mime: string | null;
  reviewedBy: string | null;
  /** ISO time the file was deleted after the decision. */
  deletedAt: string | null;
}

/** The proof on a verification request, or null when none was uploaded. */
export function toProofSummary(request: {
  proofType: string | null;
  proofNote: string | null;
  proofFileUrl: string | null;
  proofMime: string | null;
  reviewedBy: string | null;
  proofDeletedAt: Date | string | null;
}): ProofSummary | null {
  if (!request.proofType) return null;
  return {
    type: request.proofType,
    note: request.proofNote,
    fileUrl: request.proofFileUrl,
    mime: request.proofMime,
    reviewedBy: request.reviewedBy,
    deletedAt: request.proofDeletedAt ? new Date(request.proofDeletedAt).toISOString() : null,
  };
}
