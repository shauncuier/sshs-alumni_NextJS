import React from "react";
import { Phone } from "lucide-react";
import FacebookIcon from "@/components/shared/FacebookIcon";
import { PERSON_PLACEHOLDER } from "@/components/shared/PersonCard";
import type { CommitteeMemberView, CommitteeTier } from "@/lib/committee";

/**
 * The committee as an organisation chart: the President on top, then each level on its
 * own row, joined by connector lines. On wide screens every card of a level hangs from a
 * shared bar; a level of more than MAX_HANGING people sits in one framed group instead.
 * On phones the rows wrap and only the stems between levels show.
 */

const MAX_HANGING = 6;

function MemberCard({ m, lead = false }: { m: CommitteeMemberView; lead?: boolean }) {
  const meta = [m.lifeMemberNo ? `LM ${m.lifeMemberNo}` : null, m.sscBatch ? `SSC ${m.sscBatch}` : null].filter(Boolean).join(" · ");
  return (
    <article
      className={`relative bg-white text-center border shadow-sm ${
        lead ? "w-60 sm:w-64 rounded-3xl p-5 border-amber-300 shadow-amber-100" : "w-[9.5rem] sm:w-40 rounded-2xl p-3 border-slate-200"
      }`}
    >
      <img
        loading="lazy"
        decoding="async"
        src={m.photoUrl || PERSON_PLACEHOLDER}
        alt={m.photoUrl ? m.name : ""}
        className={`mx-auto rounded-full object-cover object-top bg-emerald-50 ${lead ? "w-28 h-28 ring-4 ring-amber-300" : "w-20 h-20 ring-4 ring-emerald-50"}`}
      />
      <h3 className={`mt-3 font-bold text-slate-900 leading-snug ${lead ? "text-lg" : "text-sm"}`}>{m.name}</h3>
      <p className={`font-black uppercase tracking-wider mt-0.5 ${lead ? "text-xs text-amber-700" : "text-[10px] text-emerald-800"}`}>{m.post}</p>
      {meta && <p className="text-[11px] text-slate-500 mt-1">{meta}</p>}
      {m.note && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{m.note}</p>}
      {(m.phone || m.facebookUrl) && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {m.phone && (
            <a href={`tel:${m.phone.replace(/[\s-]/g, "")}`} aria-label={`Call ${m.name}`} className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
          {m.facebookUrl && (
            <a href={m.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on Facebook`} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
              <FacebookIcon className="w-3.5 h-3.5 text-[#1877f2]" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

// A tick from the shared bar down to the card, and the bar itself reaching half the gap
// to each side (first and last cards stop at their middle).
const HANGING =
  "relative xl:before:absolute xl:before:left-1/2 xl:before:-top-8 xl:before:h-8 xl:before:border-l-2 xl:before:border-emerald-300 " +
  "xl:after:absolute xl:after:-top-8 xl:after:-left-3 xl:after:-right-3 xl:after:border-t-2 xl:after:border-emerald-300 " +
  "xl:first:after:left-1/2 xl:last:after:right-1/2 xl:only:after:hidden";

/** One level of the chart. */
function TierRow({ tier, first }: { tier: CommitteeTier; first: boolean }) {
  const cards = tier.members.map((m) => (
    <div key={m.id} className={first || tier.members.length > MAX_HANGING ? "relative" : HANGING}>
      <MemberCard m={m} lead={tier.key === "lead"} />
    </div>
  ));
  if (tier.members.length > MAX_HANGING) {
    return <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/50 p-4 sm:p-6 flex flex-wrap justify-center gap-4 sm:gap-6 max-w-6xl">{cards}</div>;
  }
  return <div className={`flex flex-wrap xl:flex-nowrap justify-center gap-x-6 gap-y-6 ${first ? "" : "xl:pt-8"}`}>{cards}</div>;
}

export default function CommitteeTree({ tiers }: { tiers: CommitteeTier[] }) {
  return (
    <div className="pb-2">
      <div className="mx-auto flex flex-col items-center">
        {tiers.map((tier, i) => (
          <React.Fragment key={tier.key}>
            {i > 0 && <div aria-hidden="true" className="w-0 h-8 border-l-2 border-emerald-300" />}
            <TierRow tier={tier} first={i === 0} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
