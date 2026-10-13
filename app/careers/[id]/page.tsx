import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetailClient from "@/components/careers/JobDetailClient";
import { getPublicJob } from "@/lib/jobs";
import { pageMetadata, shareCard } from "@/lib/seo";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbJsonLd, jobPostingJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await getPublicJob(id);
  if (!found) return { title: "Job not found", robots: { index: false } };
  const { job } = found;
  return pageMetadata({
    path: `/careers/${id}`,
    image: shareCard("careers"),
    title: `${job.title} at ${job.company}`,
    description: `${job.title} at ${job.company}, ${job.location}. A job shared by a Sabuj Shikshayatan alumnus${found.open ? "; apply through the alumni portal" : " (closed)"}.`,
  });
}

export default async function JobPage({ params }: Props) {
  // Pending or rejected jobs, and unknown ids, show the 404 page.
  const found = await getPublicJob((await params).id);
  if (!found) notFound();
  return (
    <>
      {/* Only open jobs go to Google's job search; a closed one would count as expired. */}
      {found.open && <JsonLd data={jobPostingJsonLd(found.job)} />}
      <JsonLd data={breadcrumbJsonLd([{ name: "Jobs", path: "/careers" }, { name: found.job.title, path: `/careers/${found.job.id}` }])} />
      <JobDetailClient job={found.job} open={found.open} />
    </>
  );
}
