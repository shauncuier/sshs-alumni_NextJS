// Client helpers for the admin verification queue (/api/admin/verifications).

import type { VerificationRequestItem } from "@/lib/data";
import { proofTypeLabel, toProofSummary, type ProofSummary } from "@/lib/members/proof-types";

type RequestStatus = VerificationRequestItem["status"];

// Shape of one request as returned by GET /api/admin/verifications.
interface VerificationRequestRow {
  id: string;
  sscBatch: number;
  rollNumber: string | null;
  proofDocumentUrl: string | null;
  proofType: string | null;
  proofNote: string | null;
  proofFileUrl: string | null;
  proofMime: string | null;
  proofDeletedAt: string | null;
  reviewedBy: string | null;
  status: RequestStatus;
  createdAt: string;
  awaitingPayment?: boolean;
  user: {
    email: string;
    profile: {
      fullName: string;
      phone: string | null;
      avatarUrl: string | null;
      profession: string;
      locationCity: string;
      locationCountry: string;
    } | null;
  };
}

function toItem(row: VerificationRequestRow): VerificationRequestItem {
  const profile = row.user.profile;
  return {
    id: row.id,
    fullName: profile?.fullName ?? row.user.email,
    email: row.user.email,
    phone: profile?.phone ?? "",
    avatarUrl: profile?.avatarUrl || "/logo.png",
    sscBatch: row.sscBatch,
    rollNumber: row.rollNumber ?? "",
    profession: profile?.profession ?? "",
    location: profile ? `${profile.locationCity}, ${profile.locationCountry}` : "",
    documentType: row.proofType
      ? proofTypeLabel(row.proofType)
      : row.proofDocumentUrl
        ? "Uploaded document"
        : "No document uploaded",
    documentUrl: row.proofFileUrl ?? row.proofDocumentUrl ?? "",
    proof: toProofSummary(row),
    submittedAt: new Date(row.createdAt).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    status: row.status,
    awaitingPayment: row.awaitingPayment ?? false,
  };
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchVerificationRequests(
  status: RequestStatus | "all" = "all"
): Promise<VerificationRequestItem[]> {
  const res = await fetch(`/api/admin/verifications?status=${status}`, { cache: "no-store" });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not load verification requests."));
  const body: { requests: VerificationRequestRow[] } = await res.json();
  return body.requests.map(toItem);
}

// Approving also verifies the member's account and profile; see the PATCH handler.
// Resolves to the request's proof after the decision (its file is deleted by then).
export async function decideVerification(
  requestId: string,
  status: "VERIFIED" | "REJECTED"
): Promise<ProofSummary | null> {
  const res = await fetch("/api/admin/verifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, status }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not save the verification decision."));
  const body: { request?: VerificationRequestRow } = await res.json().catch(() => ({}));
  return body.request ? toProofSummary(body.request) : null;
}
