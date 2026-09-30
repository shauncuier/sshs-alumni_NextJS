// Documents a new member can upload to show they studied at SSGHS.
// Browser-safe: used by the join form, the admin views and the server.

export const PROOF_TYPES = [
  { value: "SSC_CERTIFICATE", label: "SSC certificate" },
  { value: "SSC_MARKSHEET", label: "SSC marksheet / transcript" },
  { value: "SSC_ADMIT_OR_REGISTRATION", label: "SSC admit or registration card" },
  { value: "SCHOOL_TESTIMONIAL", label: "School testimonial / leaving certificate" },
  { value: "SCHOOL_ID_CARD", label: "Old school ID card" },
  { value: "OTHER", label: "Other (explain)" },
] as const;

export type ProofType = (typeof PROOF_TYPES)[number]["value"];

/** OTHER needs a short description of the document, up to this many characters. */
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
  return PROOF_TYPES.find((t) => t.value === value)?.label ?? value;
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
