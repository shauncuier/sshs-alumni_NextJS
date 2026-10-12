import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session-user";
import NewJobForm from "./NewJobForm";

export const metadata = { title: "Post a job | SSGHS Alumni" };

// Posting a job needs a member account: send visitors to sign in first instead of
// letting them fill in the whole form and be refused at the end.
export default async function NewJobPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/careers/new");
  return <NewJobForm />;
}
