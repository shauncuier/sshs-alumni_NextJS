import type { Metadata } from "next";
import CareersClient from "@/components/careers/CareersClient";
import { listOpenJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Jobs shared by SSGHS alumni, reviewed by the committee.",
};

// Approved jobs still taking applications; pending ones never appear here.
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  return <CareersClient jobs={await listOpenJobs()} />;
}
