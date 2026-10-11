import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MentorProfileForm from "@/components/mentorship/MentorProfileForm";
import { getOwnMentorProfile, MENTOR_DOMAINS } from "@/lib/mentorship";
import { getSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Become a mentor | SSGHS Alumni" };

const join = (v: unknown) => (Array.isArray(v) ? v.map(String).join("\n") : "");

// Apply to mentor, or edit one's mentor profile.
export default async function BecomeMentorPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/mentorship/become");
  const mentor = await getOwnMentorProfile(me.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-5">
          <Link href="/mentorship" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <ArrowLeft className="w-4 h-4" /> Mentorship
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">{mentor ? "Your mentor profile" : "Become a mentor"}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Help younger SSGHS alumni with career advice. Verified members can apply; the committee approves each profile.</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
            <MentorProfileForm
              domains={MENTOR_DOMAINS}
              initial={{
                id: mentor?.id ?? null,
                status: mentor?.status ?? null,
                rejectReason: mentor?.rejectReason ?? null,
                designation: mentor?.designation ?? "",
                organization: mentor?.organization ?? "",
                domain: mentor?.domain ?? MENTOR_DOMAINS[0],
                locationCity: mentor?.locationCity ?? "",
                bio: mentor?.bio ?? "",
                yearsOfExperience: mentor ? String(mentor.yearsOfExperience) : "",
                availableDays: join(mentor?.availableDays),
                skills: join(mentor?.skills),
                topicsOffered: join(mentor?.topicsOffered),
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
