import type { Metadata } from "next";
import { getBatch, isBatchYear } from "@/lib/batches";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import JsonLd from "@/components/shared/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const year = Number((await params).year);
  if (!Number.isInteger(year) || !isBatchYear(year)) return { title: "Batch not found", robots: { index: false } };
  const batch = await getBatch(year).catch(() => null);
  const members = batch?.totalAlumni ?? 0;
  return pageMetadata({
    path: `/batches/${year}`,
    // The card comes from ./opengraph-image.tsx (the year in the emblem).
    image: "file",
    title: `SSC batch ${year}`,
    description: `Sabuj Shikshayatan SSC batch ${year}: find your classmates, the batch representative and reunion news.${members > 0 ? ` ${members} verified ${members === 1 ? "member" : "members"} so far.` : ""}`,
    // A year with no members yet has nothing for searchers.
    noindex: members === 0,
  });
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ year: string }> }) {
  const { year } = await params;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Batches", path: "/batches" }, { name: `SSC batch ${year}`, path: `/batches/${year}` }])} />
      {children}
    </>
  );
}
