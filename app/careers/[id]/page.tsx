import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetailClient from "@/components/careers/JobDetailClient";
import { getPublicJob } from "@/lib/jobs";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await getPublicJob(id);
  if (!found) return { title: "Job not found", robots: { index: false } };
  const { job } = found;
  return pageMetadata({
    path: `/careers/${id}`,
    title: `${job.title} at ${job.company}`,
    description: `${job.title} at ${job.company}, ${job.location}. A job shared by a Sabuj Shikshayatan alumnus${found.open ? "; apply through the alumni portal" : " (closed)"}.`,
  });
}

export default async function JobPage({ params }: Props) {
  // Pending or rejected jobs, and unknown ids, show the 404 page.
  const found = await getPublicJob((await params).id);
  if (!found) notFound();
  return <JobDetailClient job={found.job} open={found.open} />;
}
