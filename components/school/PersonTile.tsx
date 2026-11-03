import { PERSON_PLACEHOLDER } from "@/components/shared/PersonCard";
import type { SchoolPersonView } from "@/lib/teachers-shared";

// A founder, teacher or staff member: portrait, Bangla and English name, post. People without a photo get the placeholder.
export default function PersonTile({ person, size = "sm", dark = false }: { person: SchoolPersonView; size?: "sm" | "lg"; dark?: boolean }) {
  const lg = size === "lg";
  const late = person.status === "LATE";
  const nameEn = person.nameEn && late && !/^late\b/i.test(person.nameEn) ? `Late ${person.nameEn}` : person.nameEn;
  const headNow = person.kind === "HEAD_TEACHER" && person.status === "CURRENT";
  return (
    <figure className="flex flex-col items-center text-center gap-2">
      <div className="relative">
        <img
          loading="lazy"
          decoding="async"
          src={person.photoUrl ?? PERSON_PLACEHOLDER}
          alt={person.photoUrl ? person.nameEn || person.nameBn : ""}
          className={`${lg ? "w-28 h-32 sm:w-32 sm:h-36" : "w-24 h-28 sm:w-28 sm:h-32"} rounded-2xl object-cover object-top bg-emerald-50 ring-2 ${late ? "ring-slate-300 grayscale-[35%]" : "ring-amber-300/70"} shadow-md`}
        />
        {headNow && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 shadow">Head teacher now</span>
        )}
      </div>
      <figcaption className={`space-y-0.5 ${headNow ? "pt-1" : ""}`}>
        <p lang="bn" className={`font-bold leading-snug ${lg ? "text-sm" : "text-xs sm:text-sm"} ${dark ? "text-white" : "text-slate-900"}`}>
          {person.nameBn}
        </p>
        {nameEn && <p className={`text-[11px] font-semibold ${dark ? "text-emerald-200" : "text-emerald-800"}`}>{nameEn}</p>}
        <p className={`text-[11px] leading-snug ${dark ? "text-emerald-100/80" : "text-slate-500"}`}>
          {person.roleEn || person.roleBn}
          {person.tenure ? ` · ${person.tenure}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}
