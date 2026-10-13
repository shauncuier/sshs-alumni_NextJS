import type { Metadata } from "next";
import { getBatch, isBatchYear } from "@/lib/batches";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const year = Number((await params).year);
  if (!Number.isInteger(year) || !isBatchYear(year)) return { title: "Batch not found", robots: { index: false } };
  const batch = await getBatch(year).catch(() => null);
  const members = batch?.totalAlumni ?? 0;
  return pageMetadata({
    path: `/batches/${year}`,
    title: `SSC batch ${year}`,
    description: `Sabuj Shikshayatan SSC batch ${year}: find your classmates, the batch representative and reunion news.${members > 0 ? ` ${members} verified ${members === 1 ? "member" : "members"} so far.` : ""}`,
    // A year with no members yet has nothing for searchers.
    noindex: members === 0,
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
