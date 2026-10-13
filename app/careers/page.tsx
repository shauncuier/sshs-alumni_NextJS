import type { Metadata } from "next";
import CareersClient from "@/components/careers/CareersClient";
import { listOpenJobs } from "@/lib/jobs";
import { pageMetadata, shareCard } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ image: shareCard("careers"), path: "/careers", title: "Jobs from alumni", description: "Job openings shared by Sabuj Shikshayatan alumni and checked by the committee. Apply directly, or post a job for fellow alumni." });

// Approved jobs still taking applications; pending ones never appear here.
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  return <CareersClient jobs={await listOpenJobs()} />;
}
