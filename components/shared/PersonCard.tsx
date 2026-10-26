import React from "react";
import { Phone } from "lucide-react";
import FacebookIcon from "@/components/shared/FacebookIcon";

export const PERSON_PLACEHOLDER = "/placeholders/person.svg";

/**
 * A portrait card for committee members and honor board names: photo (or the
 * placeholder), name, a role line, detail lines and optional phone / Facebook links.
 */
export default function PersonCard({
  name,
  role,
  details,
  photoUrl,
  phone,
  facebookUrl,
}: {
  name: string;
  role?: string | null;
  details?: (string | null | undefined)[];
  photoUrl?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
}) {
  const lines = (details ?? []).filter(Boolean) as string[];
  return (
    <article className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="aspect-[5/6] bg-emerald-50">
        <img loading="lazy" decoding="async" src={photoUrl || PERSON_PLACEHOLDER} alt={photoUrl ? name : ""} className="w-full h-full object-cover object-top" />
      </div>
      <div className="p-4 text-center space-y-1 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-900 leading-snug">{name}</h3>
        {role && <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">{role}</p>}
        {lines.map((l) => (
          <p key={l} className="text-xs text-slate-500">{l}</p>
        ))}
        {(phone || facebookUrl) && (
          <div className="flex items-center justify-center gap-2 pt-2 mt-auto">
            {phone && (
              <a href={`tel:${phone.replace(/[\s-]/g, "")}`} className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold">
                <Phone className="w-3.5 h-3.5" /> {phone}
              </a>
            )}
            {facebookUrl && (
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Facebook`} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200">
                <FacebookIcon className="w-4 h-4 text-[#1877f2]" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
