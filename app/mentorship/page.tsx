import MentorshipClient from "@/components/mentorship/MentorshipClient";
import { getOwnMentorProfile, listApprovedMentors, MENTOR_DOMAINS } from "@/lib/mentorship";
import { getSessionUser } from "@/lib/session-user";

// Approved mentors only; pending or paused profiles never appear here.
export const dynamic = "force-dynamic";

export default async function MentorshipPage() {
  const me = await getSessionUser();
  const [mentors, own] = await Promise.all([listApprovedMentors(), me ? getOwnMentorProfile(me.id) : null]);
  return <MentorshipClient mentors={mentors} domains={MENTOR_DOMAINS} signedIn={Boolean(me)} ownMentorId={own?.id ?? null} />;
}
