import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import NewJobForm from "./NewJobForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ path: "/careers/new", title: "Post a job", description: "Share a job opening with fellow alumni.", noindex: true });

// Posting a job needs a member account: send visitors to sign in first instead of
// letting them fill in the whole form and be refused at the end.
export default async function NewJobPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/careers/new");
  return <NewJobForm />;
}
