import { PERSON_PLACEHOLDER } from "@/components/shared/PersonCard";
import type { SchoolPerson } from "@/lib/school-history";

// A founder or former teacher: portrait, Bangla and English name, role. People without a photo get the placeholder.
export default function PersonTile({ person, size = "sm", dark = false }: { person: SchoolPerson; size?: "sm" | "lg"; dark?: boolean }) {
  const lg = size === "lg";
  return (
    <figure className="flex flex-col items-center text-center gap-2">
      <img
        loading="lazy"
        decoding="async"
        src={person.photo ?? PERSON_PLACEHOLDER}
        alt={person.photo ? person.name : ""}
        className={`${lg ? "w-28 h-32 sm:w-32 sm:h-36" : "w-24 h-28 sm:w-28 sm:h-32"} rounded-2xl object-cover object-top bg-emerald-50 ring-2 ring-amber-300/70 shadow-md`}
      />
      <figcaption className="space-y-0.5">
        <p lang="bn" className={`font-bold leading-snug ${lg ? "text-sm" : "text-xs sm:text-sm"} ${dark ? "text-white" : "text-slate-900"}`}>
          {person.nameBn}
        </p>
        <p className={`text-[11px] font-semibold ${dark ? "text-emerald-200" : "text-emerald-800"}`}>{person.name}</p>
        <p className={`text-[11px] leading-snug ${dark ? "text-emerald-100/80" : "text-slate-500"}`}>
          {person.role}
          {person.tenure ? ` · ${person.tenure}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}
