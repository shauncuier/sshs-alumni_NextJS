import type { SchoolPersonKind, SchoolPersonStatus } from "@prisma/client";

// The parts of lib/teachers.ts the admin page needs in the browser.

export interface SchoolPersonView {
  id: string;
  kind: SchoolPersonKind;
  status: SchoolPersonStatus;
  nameBn: string;
  nameEn: string | null;
  roleBn: string | null;
  roleEn: string | null;
  tenure: string | null;
  photoUrl: string | null;
  note: string | null;
  onHomePage: boolean;
  isPublished: boolean;
  sortOrder: number;
}

export const PERSON_KINDS: { value: SchoolPersonKind; label: string; labelBn: string }[] = [
  { value: "FOUNDER", label: "Founder", labelBn: "প্রতিষ্ঠাতা" },
  { value: "HEAD_TEACHER", label: "Head teacher", labelBn: "প্রধান শিক্ষক" },
  { value: "TEACHER", label: "Teacher", labelBn: "শিক্ষক" },
  { value: "STAFF", label: "Office staff", labelBn: "অফিস স্টাফ" },
];

export const PERSON_STATUSES: { value: SchoolPersonStatus; label: string }[] = [
  { value: "CURRENT", label: "Current (at the school now)" },
  { value: "FORMER", label: "Former (left or retired)" },
  { value: "LATE", label: "Late (passed away)" },
  { value: "UNKNOWN", label: "Not known yet (hidden)" },
];

/** Whether the public may see this person: published, and with a known status unless a founder. */
export function isShown(p: SchoolPersonView): boolean {
  return p.isPublished && (p.kind === "FOUNDER" || p.status !== "UNKNOWN");
}
