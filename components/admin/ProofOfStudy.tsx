import React from "react";
import { proofTypeLabel, type ProofSummary } from "@/lib/members/proof-types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * A member's proof of study for admins: the document type (and note), a link to
 * the private file while it exists, or who checked it once it has been deleted.
 */
export default function ProofOfStudy({ proof, emptyText }: { proof: ProofSummary | null | undefined; emptyText?: string }) {
  if (!proof) return emptyText ? <div className="text-[11px] text-slate-400">{emptyText}</div> : null;
  return (
    <div className="text-[11px] space-y-0.5 min-w-0">
      <div className="text-slate-700">
        <span className="font-semibold">Proof:</span> {proofTypeLabel(proof.type)}
        {proof.note && <span className="text-slate-500"> — “{proof.note}”</span>}
      </div>
      {proof.fileUrl ? (
        <a href={proof.fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">
          View proof
        </a>
      ) : proof.deletedAt ? (
        <div className="text-slate-500">
          Proof checked by {proof.reviewedBy ?? "an administrator"} — file deleted {formatDate(proof.deletedAt)}
        </div>
      ) : (
        <div className="text-slate-400">No file on record</div>
      )}
    </div>
  );
}
