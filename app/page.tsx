import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatCounter from "@/components/shared/StatCounter";
import AlumniCard from "@/components/alumni/AlumniCard";
import BatchCard from "@/components/batches/BatchCard";
import EventCard from "@/components/events/EventCard";
import StoryCard from "@/components/stories/StoryCard";
import { getMembershipEvent, listPublicEvents } from "@/lib/events/service";
import { latestPublishedPhotos } from "@/lib/gallery";
import { listPublishedStories } from "@/lib/stories";
import { listPublishedAchievements } from "@/lib/achievements";
import { listOpenCampaigns } from "@/lib/campaigns";
import { listPublishedNews } from "@/lib/news";
import { listOpenJobs } from "@/lib/jobs";
import { listApprovedMentors } from "@/lib/mentorship";
import { listBatches } from "@/lib/batches";
import { formatTaka } from "@/lib/events/pricing";
import { formatDate } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { schoolInfo, type AlumniMember } from "@/lib/data";
import { ArrowRight, Briefcase, CalendarDays, GraduationCap, Heart, MapPin, Newspaper, Sparkles, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "SSGHS Alumni Association | Sabuj Shikshayatan Government High School" },
  description:
    "The alumni association of Sabuj Shikshayatan Government High School, Sitakunda: find batchmates, join events, mentor juniors and give back to the school.",
  openGraph: { images: [{ url: "/golden-jubilee.jpg", width: 1376, height: 768 }] },
};

// Every section below shows real records and hides itself when there are none.
export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  const yearsSinceFounding = new Date().getFullYear() - schoolInfo.established;
  // Members the public directory lists: verified profiles of accounts that are not disabled.
  const listed = { verificationStatus: "VERIFIED" as const, user: { disabledAt: null } };

  const [
    verifiedCount,
    countries,
    professions,
    recentProfiles,
    batches,
    campaigns,
    stories,
    achievements,
    photos,
    events,
    membershipEvent,
    news,
    jobs,
    mentors,
  ] = await Promise.all([
    prisma.alumniProfile.count({ where: listed }).catch(() => 0),
    prisma.alumniProfile.groupBy({ by: ["locationCountry"], where: { ...listed, locationCountry: { not: "" } } }).catch(() => []),
    prisma.alumniProfile.groupBy({ by: ["profession"], where: { ...listed, profession: { not: "" } } }).catch(() => []),
    prisma.alumniProfile
      .findMany({ where: listed, take: 4, orderBy: { createdAt: "desc" }, include: { user: { select: { email: true } } } })
      .catch(() => []),
    listBatches().catch(() => []),
    listOpenCampaigns().catch(() => []),
    listPublishedStories(2).catch(() => []),
    listPublishedAchievements(3).catch(() => []),
    latestPublishedPhotos(4).catch(() => []),
    listPublicEvents().catch(() => []),
    getMembershipEvent().catch(() => null),
    listPublishedNews(3).catch(() => []),
    listOpenJobs().catch(() => []),
    listApprovedMentors().catch(() => []),
  ]);

  const recentMembers: AlumniMember[] = recentProfiles.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    sscBatch: p.sscBatch,
    graduationYear: p.graduationYear || p.sscBatch,
    profession: p.profession,
    company: p.company ?? "",
    industry: p.industry ?? "",
    locationCity: p.locationCity,
    locationCountry: p.locationCountry,
    bio: p.bio ?? "",
    avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName)}&background=06281e&color=fcd34d&bold=true`,
    isVerified: true,
    phone: p.isPhonePublic ? p.phone || undefined : undefined,
    email: p.isEmailPublic ? p.user.email : "",
    skills: Array.isArray(p.skills) ? (p.skills as string[]) : [],
    connectionCount: 0,
  }));

  const batchesWithMembers = batches.filter((b) => b.totalAlumni > 0);
  const topBatches = [...batchesWithMembers].sort((a, b) => b.totalAlumni - a.totalAlumni || b.year - a.year).slice(0, 3);

  // The hero shows the membership event (joining the association) or, failing that, the next big event.
  const heroEvent = membershipEvent ?? events.find((e) => e.isMegaEvent && e.date >= today) ?? null;
  const upcomingEvents = events.filter((e) => e.date >= today && e.id !== heroEvent?.id).slice(0, 3);
  const featuredCampaign = campaigns[0] ?? null;
  const latestJobs = jobs.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1">
        {/* 1. HERO */}
        <section className="relative bg-[#06281e] text-white overflow-hidden py-16 lg:py-24">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Alumni Association · EIIN {schoolInfo.eiin}</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                  Connecting Generations of{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-amber-300">Sabuj Shikshayatan</span>
                </h1>

                <p className="text-base sm:text-xl text-emerald-100/90 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  One school, {yearsSinceFounding} years of students. Find your batchmates, join our events and help the school that taught us.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold text-base shadow-xl transition-colors text-center flex items-center justify-center gap-2">
                    <span>Join the association</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link href="/alumni" className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#0b3d2c]/90 hover:bg-[#0e4d36] text-emerald-200 hover:text-white border border-emerald-700/60 font-bold text-base transition-colors text-center">
                    Find alumni
                  </Link>
                </div>

                {verifiedCount > 0 && (
                  <div className="pt-2 flex items-center justify-center lg:justify-start gap-4 text-xs text-emerald-300/90">
                    <div className="flex -space-x-2">
                      {recentMembers.map((a) => (
                        <img key={a.id} loading="lazy" decoding="async" src={a.avatarUrl} alt="" className="w-8 h-8 rounded-full border-2 border-[#06281e] object-cover" />
                      ))}
                    </div>
                    <span>
                      {verifiedCount} verified {verifiedCount === 1 ? "member" : "members"} from {batchesWithMembers.length} {batchesWithMembers.length === 1 ? "batch" : "batches"}
                    </span>
                  </div>
                )}
              </div>

              {/* Membership / next big event, from the events table */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-600/40 bg-[#041a13]">
                  {heroEvent?.bannerImage && !heroEvent.bannerImage.startsWith("/golden-jubilee") ? (
                    <img src={heroEvent.bannerImage} alt="" loading="eager" fetchPriority="high" decoding="async" className="w-full h-[360px] sm:h-[400px] object-cover" />
                  ) : (
                    <Image
                      src="/golden-jubilee.jpg"
                      alt={`${schoolInfo.name}, ${yearsSinceFounding} years`}
                      width={1376}
                      height={768}
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      loading="eager"
                      fetchPriority="high"
                      className="w-full h-[360px] sm:h-[400px] object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06281e] via-[#06281e]/30 to-transparent" />
                  <div className="absolute -top-0 right-4 mt-4 bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>{yearsSinceFounding} years · {schoolInfo.established}–{new Date().getFullYear()}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-[#06281e]/95 border border-amber-400/50 shadow-2xl flex items-center justify-between gap-3">
                    {heroEvent ? (
                      <>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                            {heroEvent.isMembershipEvent ? "Join through this event" : "Coming up"}
                          </p>
                          <p className="font-bold text-sm text-white line-clamp-2">{heroEvent.title}</p>
                          <p className="text-xs text-emerald-200 mt-0.5">
                            {formatDate(heroEvent.date)}
                            {heroEvent.locationCity ? ` · ${heroEvent.locationCity}` : ""}
                          </p>
                        </div>
                        <Link href={`/events/${heroEvent.slug}`} className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0">
                          {heroEvent.isMembershipEvent ? "Register" : "Details"}
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-sm text-white">Become a member of the alumni association</p>
                        <Link href="/register" className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0">
                          Join
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. NUMBERS (only real counts; hidden until there are members) */}
        {verifiedCount > 0 && (
          <section className="bg-white border-y border-slate-200/80 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8">
              {[
                { n: verifiedCount, label: "Verified members", note: "In the alumni directory" },
                { n: batchesWithMembers.length, label: "SSC batches", note: "With verified members" },
                { n: countries.length, label: "Countries", note: "Where members live" },
                { n: professions.length, label: "Professions", note: "Members' fields of work" },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight">
                    <StatCounter end={s.n} />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mt-1">{s.label}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. ABOUT: facts about the school and what the site offers */}
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="w-4 h-4" />
                <span>Since {schoolInfo.established}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">One school, generations of friends</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {schoolInfo.name} ({schoolInfo.bengaliName}) in {schoolInfo.location} has taught students for {yearsSinceFounding} years.
                The alumni association keeps its former students in touch with each other and with the school.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  { href: "/batches", label: "Find your batch and classmates" },
                  { href: "/alumni", label: "Verified member directory" },
                  { href: "/events", label: "Events with digital tickets" },
                  { href: "/mentorship", label: "Mentorship from senior alumni" },
                  { href: "/careers", label: "Jobs shared by alumni" },
                  { href: "/donate", label: "Give back to the school" },
                ].map((f) => (
                  <li key={f.href}>
                    <Link href={f.href} className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-emerald-800 py-1">
                      <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{f.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/about" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-700">
                <span>More about the association</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden shadow-md border border-slate-200">
                <Image src="/golden-jubilee.jpg" alt={`${schoolInfo.name} golden jubilee`} width={1376} height={768} sizes="(max-width: 1024px) 100vw, 50vw" className="w-full h-64 sm:h-80 object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* 4. LATEST NEWS */}
        {news.length > 0 && (
          <section className="py-16 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="News" title="Latest from the association" href="/news" link="All news" icon={<Newspaper className="w-4 h-4" />} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {news.map((n) => (
                  <Link key={n.id} href={`/news/${n.id}`} className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    <img src={n.featuredImage} alt="" loading="lazy" decoding="async" className="w-full h-44 object-cover" />
                    <div className="p-5 space-y-2 flex-1">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{n.category} · {n.date}</p>
                      <h3 className="font-bold text-base text-slate-900 leading-snug group-hover:text-emerald-800">{n.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-3">{n.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. RECENTLY JOINED MEMBERS */}
        {recentMembers.length > 0 && (
          <section className="py-16 lg:py-20 bg-slate-50 border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="Directory" title="Recently joined members" href="/alumni" link={`All ${verifiedCount} members`} icon={<Users className="w-4 h-4" />} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentMembers.map((m) => (
                  <AlumniCard key={m.id} alumni={m} viewMode="grid" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. UPCOMING EVENTS */}
        {upcomingEvents.length > 0 && (
          <section className="py-16 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="Events" title="Upcoming events" href="/events" link="All events" icon={<CalendarDays className="w-4 h-4" />} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {upcomingEvents.map((evt) => (
                  <EventCard key={evt.id} event={evt} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. BATCHES WITH THE MOST MEMBERS */}
        {topBatches.length > 0 && (
          <section className="py-16 lg:py-20 bg-slate-50 border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="Batches" title="Explore by SSC batch" href="/batches" link="All batches" icon={<GraduationCap className="w-4 h-4" />} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topBatches.map((batch) => (
                  <BatchCard key={batch.year} batch={batch} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 8. CAREERS & MENTORSHIP */}
        {(latestJobs.length > 0 || mentors.length > 0) && (
          <section className="py-16 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {latestJobs.length > 0 && (
                <div className={mentors.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
                  <SectionHeader eyebrow="Careers" title="Jobs shared by alumni" href="/careers" link={`All ${jobs.length} open jobs`} icon={<Briefcase className="w-4 h-4" />} />
                  <ul className="space-y-3">
                    {latestJobs.map((j) => (
                      <li key={j.id}>
                        <Link href={`/careers/${j.id}`} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-white transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 truncate">{j.title}</p>
                            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                              {j.company} · <MapPin className="w-3 h-3" /> {j.location} · {j.jobType}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-emerald-700 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {mentors.length > 0 && (
                <div className="rounded-3xl bg-[#06281e] text-white p-6 sm:p-8 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Mentorship</p>
                    <p className="text-4xl font-black">{mentors.length}</p>
                    <p className="text-sm text-emerald-100">
                      {mentors.length === 1 ? "alumnus is" : "alumni are"} ready to guide younger members on study and career choices.
                    </p>
                  </div>
                  <Link href="/mentorship" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm">
                    Find a mentor <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 9. STORIES */}
        {stories.length > 0 && (
          <section className="py-16 lg:py-20 bg-[#06281e] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader dark eyebrow="Stories" title="Stories from our alumni" href="/stories" link="All stories" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 10. HALL OF FAME */}
        {achievements.length > 0 && (
          <section className="py-16 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="Achievements" title="Alumni hall of fame" href="/achievements" link="All achievements" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {achievements.map((ach) => (
                  <div key={ach.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">{ach.category}</span>
                        <span className="text-xs font-semibold text-slate-500">{ach.yearAwarded}</span>
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <img loading="lazy" decoding="async" src={ach.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-emerald-300" />
                        <div>
                          <div className="font-bold text-sm text-slate-900">{ach.recipientName}</div>
                          <div className="text-xs text-slate-500">SSC {ach.batchYear}</div>
                        </div>
                      </div>
                      <h3 className="font-bold text-base text-slate-800 leading-snug">{ach.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{ach.description}</p>
                    </div>
                    {ach.organization && <div className="pt-4 mt-4 border-t border-slate-200/80 text-[11px] text-emerald-800 font-semibold">{ach.organization}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 11. GIVING BACK: the newest open campaign */}
        {featuredCampaign && (
          <section className="py-16 lg:py-20 bg-emerald-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
                  <Heart className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Give back</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">{featuredCampaign.title}</h2>
                <p className="text-sm text-emerald-100/90 leading-relaxed max-w-xl line-clamp-4">{featuredCampaign.description}</p>
                <div className="space-y-2 max-w-lg">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-300">Raised {formatTaka(featuredCampaign.raisedAmount)}</span>
                    <span className="text-emerald-300">Goal {formatTaka(featuredCampaign.goalAmount)}</span>
                  </div>
                  <div className="w-full h-3 bg-emerald-900 rounded-full overflow-hidden p-0.5 border border-emerald-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                      style={{ width: `${featuredCampaign.goalAmount > 0 ? Math.min((featuredCampaign.raisedAmount / featuredCampaign.goalAmount) * 100, 100) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-300">
                    <span>{featuredCampaign.donorCount} {featuredCampaign.donorCount === 1 ? "donor" : "donors"}</span>
                    {featuredCampaign.daysLeft !== null && <span>{featuredCampaign.daysLeft} days left</span>}
                  </div>
                </div>
                {campaigns.length > 1 && (
                  <Link href="/donate" className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 font-semibold text-xs border border-emerald-700">
                    See all {campaigns.length} open campaigns
                  </Link>
                )}
              </div>
              <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <h3 className="font-extrabold text-lg">Choose an amount</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">Every donation is checked by the committee before it counts.</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[500, 1000, 5000, 10000].map((amt) => (
                    <Link key={amt} href={`/donate?amount=${amt}`} className="py-3 rounded-xl text-sm font-bold border bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-center">
                      {formatTaka(amt)}
                    </Link>
                  ))}
                </div>
                <Link href="/donate" className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Donate</span>
                </Link>
                <p className="text-[11px] text-slate-500 text-center mt-3">Pay by bKash, Nagad, Bangla QR or bank transfer, then enter the transaction ID.</p>
              </div>
            </div>
          </section>
        )}

        {/* 12. GALLERY */}
        {photos.length > 0 && (
          <section className="py-16 lg:py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader eyebrow="Gallery" title="Photos from our albums" href="/gallery" link="Open the gallery" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {photos.map((item) => (
                  <Link key={item.id} href="/gallery" className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow h-48 sm:h-64 bg-slate-900">
                    <img loading="lazy" decoding="async" src={item.thumbUrl ?? item.imageUrl} alt={item.caption || item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] uppercase font-bold text-amber-300 block mb-0.5">{item.albumCategory}</span>
                      <p className="font-bold text-xs sm:text-sm line-clamp-1">{item.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 13. JOIN */}
        <section className="py-16 lg:py-20 bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">Studied at Sabuj Shikshayatan?</h2>
            <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Join the association: verify your SSC batch, find your classmates and never miss an alumni event.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-xl">
                Join the association
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 font-semibold text-sm">
                Member sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SectionHeader({ eyebrow, title, href, link, icon, dark }: { eyebrow: string; title: string; href: string; link: string; icon?: React.ReactNode; dark?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${dark ? "text-amber-300" : "text-emerald-700"}`}>
          {icon}
          {eyebrow}
        </p>
        <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
      </div>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-xs shrink-0 w-fit ${
          dark ? "bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60" : "bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700"
        }`}
      >
        <span>{link}</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
