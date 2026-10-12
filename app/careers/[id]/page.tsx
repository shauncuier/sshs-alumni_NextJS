import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobDetailClient from "@/components/careers/JobDetailClient";
import { getPublicJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublicJob((await params).id);
  return found ? { title: `${found.job.title} at ${found.job.company}` } : { title: "Job not found" };
}

export default async function JobPage({ params }: Props) {
  // Pending or rejected jobs, and unknown ids, show the 404 page.
  const found = await getPublicJob((await params).id);
  if (!found) notFound();
  return <JobDetailClient job={found.job} open={found.open} />;
}
