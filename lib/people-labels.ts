import prisma from "@/lib/prisma";
import { ASSOCIATION_NAME } from "@/lib/seo";

/**
 * Staff actions are recorded by email (who uploaded a photo, confirmed a payment,
 * entered a voucher). Pages show the person instead: "Name (SSC 2013)", never the
 * email address. An email with no member profile shows as the association.
 */

const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** One label per distinct value: emails become "Name (SSC year)"; other text stays as it is. */
export async function personLabels(values: (string | null | undefined)[]): Promise<Map<string, string>> {
  const emails = [...new Set(values.filter((v): v is string => typeof v === "string" && looksLikeEmail(v.trim())).map((v) => v.trim().toLowerCase()))];
  const labels = new Map<string, string>();
  if (emails.length === 0) return labels;
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, profile: { select: { fullName: true, sscBatch: true } } },
  });
  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.profile]));
  for (const email of emails) {
    const p = byEmail.get(email);
    labels.set(email, p?.fullName ? (p.sscBatch ? `${p.fullName} (SSC ${p.sscBatch})` : p.fullName) : ASSOCIATION_NAME);
  }
  return labels;
}

/** The label for one value from personLabels(): the person for an email, else the value itself. */
export function personLabel(labels: Map<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  return looksLikeEmail(v) ? (labels.get(v.toLowerCase()) ?? ASSOCIATION_NAME) : v;
}
