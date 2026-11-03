import type { SchoolPersonView } from "@/lib/teachers-shared";

const TITLES = /^(late|md\.?|mohammad|maulana|mrs\.?|mr\.?|dr\.?|a\.k\.m\.?|a\.s\.m\.?)$/i;

/** Two letters for someone without a photo, from the English name without titles (e.g. "Md. Mostafizur Rahman" → "MR"). */
export function initials(p: Pick<SchoolPersonView, "nameEn" | "nameBn">): string {
  const words = (p.nameEn ?? "").split(/\s+/).filter((w) => w && !TITLES.test(w));
  if (words.length === 0) return p.nameBn.trim().slice(0, 1);
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

// A teacher's photo, or their initials on a soft green ground when we have none. Size and shape come from className.
export default function Portrait({ person, className = "", initialsClass = "text-3xl", muted = false }: { person: SchoolPersonView; className?: string; initialsClass?: string; muted?: boolean }) {
  if (person.photoUrl) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={person.photoUrl}
        alt={person.nameEn || person.nameBn}
        className={`object-cover object-top bg-emerald-50 ${muted ? "grayscale-[60%]" : ""} ${className}`}
      />
    );
  }
  return (
    <div aria-hidden className={`flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-800/70 font-black tracking-wide ${className}`}>
      <span className={initialsClass}>{initials(person)}</span>
    </div>
  );
}
