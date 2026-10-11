import CareersClient from "@/components/careers/CareersClient";
import { listOpenJobs } from "@/lib/jobs";

// Approved jobs still taking applications; pending ones never appear here.
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  return <CareersClient jobs={await listOpenJobs()} />;
}
