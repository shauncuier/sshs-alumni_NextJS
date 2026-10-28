import type { SponsorCategory } from "@prisma/client";

/** The kinds of sponsor on /sponsors, in page order. Safe to import in the browser. */
export const SPONSOR_CATEGORIES: { value: SponsorCategory; label: string; labelBn: string }[] = [
  { value: "INFRASTRUCTURE", label: "Website infrastructure sponsor", labelBn: "ওয়েবসাইট অবকাঠামো পৃষ্ঠপোষক" },
  { value: "DEVELOPMENT", label: "Website development sponsor", labelBn: "ওয়েবসাইট উন্নয়ন পৃষ্ঠপোষক" },
  { value: "EVENT", label: "Event sponsors", labelBn: "অনুষ্ঠান পৃষ্ঠপোষক" },
  { value: "SCHOLARSHIP", label: "Scholarship and education supporters", labelBn: "শিক্ষাবৃত্তি ও শিক্ষা সহায়তাকারী" },
  { value: "SUPPORTER", label: "Supporters and well-wishers", labelBn: "সহায়তাকারী ও শুভাকাঙ্ক্ষী" },
];

export function categoryLabel(category: SponsorCategory): string {
  return SPONSOR_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
