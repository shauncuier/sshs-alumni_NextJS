import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StatCounter from "@/components/shared/StatCounter";
import AlumniCard from "@/components/alumni/AlumniCard";
import BatchCard from "@/components/batches/BatchCard";
import EventCard from "@/components/events/EventCard";
import StoryCard from "@/components/stories/StoryCard";
import { listPublicEvents } from "@/lib/events/service";
import prisma from "@/lib/prisma";
import type {
  AlumniMember,
  BatchInfo,
  AlumniStoryItem,
  AchievementItem,
  GalleryPhotoItem,
  DonationCampaignItem,
} from "@/lib/data";
import {
  schoolInfo,
  sampleBatches,
  sampleAlumni,
  sampleStories,
  sampleAchievements,
  sampleGallery,
  sampleDonations,
  sampleNews,
} from "@/lib/data";
import {
  GraduationCap,
  Users,
  Globe2,
  Briefcase,
  Heart,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Award,
  Image,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);

  // Fetch dynamic records from database with safety fallbacks
  const [
    dbVerifiedCount,
    dbBatchCount,
    dbProfiles,
    dbBatches,
    dbCampaigns,
    dbStories,
    dbAchievements,
    dbPhotos,
    allEvents,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "VERIFIED" } }).catch(() => 0),
    prisma.batch.count().catch(() => 0),
    prisma.alumniProfile
      .findMany({
        take: 4,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      })
      .catch(() => []),
    prisma.batch
      .findMany({
        take: 3,
        orderBy: { year: "desc" },
      })
      .catch(() => []),
    prisma.donationCampaign
      .findMany({
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    prisma.alumniStory
      .findMany({
        take: 2,
        orderBy: { publishedAt: "desc" },
      })
      .catch(() => []),
    prisma.achievement
      .findMany({
        take: 3,
        orderBy: { yearAwarded: "desc" },
      })
      .catch(() => []),
    prisma.galleryPhoto
      .findMany({
        take: 4,
        include: { album: true },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    listPublicEvents().catch(() => []),
  ]);

  // Dynamic Featured Alumni
  const dynamicAlumni: AlumniMember[] = dbProfiles.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    sscBatch: p.sscBatch,
    graduationYear: p.graduationYear || p.sscBatch,
    rollNumber: p.rollNumber || undefined,
    profession: p.profession || "Distinguished Alumnus",
    company: p.company || "",
    industry: p.industry || "General",
    locationCity: p.locationCity || "Chattogram",
    locationCountry: p.locationCountry || "Bangladesh",
    bio: p.bio || `Sabuj Shikshayatan SSC Batch of ${p.sscBatch}`,
    avatarUrl:
      p.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName)}&background=06281e&color=fcd34d&bold=true`,
    coverUrl: p.coverUrl || undefined,
    isVerified: p.user?.status === "VERIFIED",
    phone: p.isPhonePublic ? p.phone || undefined : undefined,
    email: p.isEmailPublic ? p.user?.email || "" : "",
    skills: Array.isArray(p.skills) ? (p.skills as string[]) : [],
    connectionCount: 15,
  }));
  const featuredAlumni: AlumniMember[] =
    dynamicAlumni.length >= 4
      ? dynamicAlumni
      : [...dynamicAlumni, ...sampleAlumni.slice(0, 4 - dynamicAlumni.length)];

  // Dynamic Batches
  const dynamicBatches: BatchInfo[] = dbBatches.map((b) => ({
    year: b.year,
    name: b.name || `SSC Batch ${b.year}`,
    tagline: b.tagline || `The Pioneering Class of ${b.year}`,
    totalAlumni: b.totalMembers > 0 ? b.totalMembers : 120,
    classRepresentative: b.classRepresentative || "Batch Secretariat",
    representativePhone: b.representativePhone || "+880 1745-950025",
    reunionDate: b.reunionDate ? b.reunionDate.toISOString().slice(0, 10) : undefined,
    coverImage:
      b.coverImage ||
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80",
    description:
      b.description ||
      `Celebrating lifelong bonds and mutual achievements of the ${b.year} SSC graduates.`,
  }));
  const featuredBatches: BatchInfo[] =
    dynamicBatches.length >= 3
      ? dynamicBatches
      : [...dynamicBatches, ...sampleBatches.slice(0, 3 - dynamicBatches.length)];

  // Dynamic Donation Campaign
  const featuredDonation: DonationCampaignItem =
    dbCampaigns.length > 0
      ? {
          id: dbCampaigns[0].id,
          title: dbCampaigns[0].title,
          category: (dbCampaigns[0].category as DonationCampaignItem["category"]) || "Scholarship",
          description: dbCampaigns[0].description,
          goalAmount: dbCampaigns[0].goalAmount,
          raisedAmount: dbCampaigns[0].raisedAmount,
          donorCount: dbCampaigns[0].donorCount,
          bannerImage: dbCampaigns[0].bannerImage || sampleDonations[0].bannerImage,
          daysLeft: dbCampaigns[0].endDate
            ? Math.max(
                0,
                Math.ceil(
                  // eslint-disable-next-line react-hooks/purity
                  (new Date(dbCampaigns[0].endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              )
            : 45,
          featured: true,
        }
      : sampleDonations[0];

  // Dynamic Stories
  const dynamicStories: AlumniStoryItem[] = dbStories.map((s) => ({
    id: s.id,
    title: s.title,
    authorName: s.authorName,
    batchYear: s.batchYear,
    profession: s.profession,
    currentOrganization: "Alumni Leader",
    coverImage:
      s.coverImage ||
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    summary: s.summary,
    fullStory: s.fullStory,
    quote: s.quote || "",
    publishedDate: s.publishedAt.toISOString().slice(0, 10),
    readTime: "4 min read",
  }));
  const featuredStories: AlumniStoryItem[] =
    dynamicStories.length >= 2
      ? dynamicStories
      : [...dynamicStories, ...sampleStories.slice(0, 2 - dynamicStories.length)];

  // Dynamic Achievements
  const dynamicAchievements: AchievementItem[] = dbAchievements.map((a) => ({
    id: a.id,
    recipientName: a.recipientName,
    batchYear: a.batchYear,
    category: (a.category as AchievementItem["category"]) || "Entrepreneurs",
    title: a.title,
    organization: a.organization,
    description: a.description,
    photoUrl:
      a.photoUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(a.recipientName)}&background=06281e&color=fcd34d&bold=true`,
    yearAwarded: a.yearAwarded,
  }));
  const featuredAchievements: AchievementItem[] =
    dynamicAchievements.length >= 3
      ? dynamicAchievements
      : [...dynamicAchievements, ...sampleAchievements.slice(0, 3 - dynamicAchievements.length)];

  // Dynamic Gallery Photos
  const dynamicGallery: GalleryPhotoItem[] = dbPhotos.map((p) => ({
    id: p.id,
    albumCategory: (p.album?.category as GalleryPhotoItem["albumCategory"]) || "Reunions",
    title: p.caption || "School Memory",
    imageUrl: p.imageUrl,
    year: p.batchYear || undefined,
    caption: p.caption || "",
    submittedBy: p.uploadedBy || "Alumnus",
  }));
  const galleryPreview: GalleryPhotoItem[] =
    dynamicGallery.length >= 4
      ? dynamicGallery
      : [...dynamicGallery, ...sampleGallery.slice(0, 4 - dynamicGallery.length)];

  const upcomingEvents = allEvents.filter((e) => e.date >= today).slice(0, 3);
  const jubileeEvent = allEvents.find((e) => e.isMegaEvent);
  const batchDisplayCount = dbBatchCount > 0 ? dbBatchCount : 41;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1">
        {/* =========================================================
            1. HERO SECTION
        ========================================================= */}
        <section className="relative bg-[#06281e] text-white overflow-hidden py-20 lg:py-28">
          {/* Subtle background overlay & texture */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headline & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* School Accreditation Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 text-xs font-semibold shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Official Digital Alumni Community • EIIN: 105070</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                  Connecting Generations of{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-amber-300">
                    Sabuj Shikshayatan
                  </span>
                </h1>

                <p className="text-base sm:text-xl text-emerald-100/90 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  One school. Generations of memories. A lifetime of connections.
                  Reunite with classmates, celebrate collective milestones, and shape the future of our alma mater.
                </p>

                {/* Primary & Secondary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold text-base shadow-xl shadow-emerald-950/60 transition-all transform hover:-translate-y-1 text-center flex items-center justify-center gap-2"
                  >
                    <span>Join the Alumni Network</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <Link
                    href="/alumni"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#0b3d2c]/90 hover:bg-[#0e4d36] text-emerald-200 hover:text-white border border-emerald-700/60 font-bold text-base transition-all text-center"
                  >
                    Explore Alumni Directory
                  </Link>
                </div>

                {/* Verified Members Badge */}
                <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 text-xs text-emerald-300/80">
                  <div className="flex -space-x-2">
                    {featuredAlumni.slice(0, 4).map((a) => (
                      <img
                        key={a.id}
                        src={a.avatarUrl}
                        alt={a.fullName}
                        className="w-8 h-8 rounded-full border-2 border-[#06281e] object-cover"
                      />
                    ))}
                  </div>
                  <span>Over 5,000+ alumni registered across {batchDisplayCount} batches</span>
                </div>
              </div>

              {/* Right Column: Hero Visual Showcase */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Outer decorative card */}
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-600/40 bg-gradient-to-b from-emerald-800/40 to-[#041a13]">
                    <img
                      src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80"
                      alt="Sabuj Shikshayatan School Reunion"
                      className="w-full h-[400px] object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06281e] via-[#06281e]/30 to-transparent" />

                    {/* Floating Info Pill 1 */}
                    <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-[#06281e]/95 backdrop-blur-md border border-amber-400/50 shadow-2xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>50-Year Golden Jubilee Landmark</span>
                        </div>
                        <div className="font-bold text-sm text-white line-clamp-1">
                          সুবর্ণ জয়ন্তী ৫০ বছর পূর্তি উৎসব
                        </div>
                        <div className="text-xs text-emerald-200">
                          Approx. Dec 30, 2026 • Sitakunda, Chattogram
                        </div>
                      </div>
                      <Link
                        href={jubileeEvent ? `/events/${jubileeEvent.slug}` : "/events"}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs transition-colors shrink-0 shadow"
                      >
                        Register
                      </Link>
                    </div>
                  </div>

                  {/* Floating badge top right */}
                  <div className="absolute -top-4 -right-4 bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 text-xs rotate-3 border-2 border-white">
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>50 Years of Legacy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            2. STATS SECTION (Animated Counters)
        ========================================================= */}
        <section className="bg-white border-y border-slate-200/80 py-10 shadow-xs relative z-20 -mt-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
              <div className="text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight">
                  <StatCounter end={5000} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mt-1">
                  Registered Alumni
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Across science, arts &amp; business</p>
              </div>

              <div className="text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight">
                  <StatCounter end={batchDisplayCount} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mt-1">
                  SSC Batches
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">From Class of 1985 to 2025</p>
              </div>

              <div className="text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight">
                  <StatCounter end={28} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mt-1">
                  Countries Worldwide
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Global alumni chapters</p>
              </div>

              <div className="text-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-900 tracking-tight">
                  <StatCounter end={110} suffix="+" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider mt-1">
                  Professions &amp; Fields
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Doctors, Engineers &amp; Leaders</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            3. ABOUT ALUMNI ASSOCIATION & SCHOOL HERITAGE
        ========================================================= */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <span>Our Heritage &amp; Purpose</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Built on Integrity, United by Lifetime Friendships.
                </h2>

                <p className="text-slate-600 text-sm leading-relaxed">
                  Sabuj Shikshayatan Government High School, nestled in South Sonaichhari, Sitakunda, Chattogram, has nurtured thousands of young minds who have gone on to lead in medicine, infrastructure engineering, computer science, education, and civil administration.
                </p>

                <p className="text-slate-600 text-sm leading-relaxed">
                  The Alumni Association serves as the institutional bridge between generations of former students and current learners. We sponsor scholarships, modernize STEM and computer laboratories, celebrate retired educators, and maintain an inclusive global network.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    "Classmate & Batch Finder",
                    "Student Merit Scholarships",
                    "Annual Mega Reunions",
                    "Free Healthcare Camps",
                    "Mentorship for Juniors",
                    "Verified Member Directory",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 hover:text-emerald-700"
                  >
                    <span>Read More About Our Constitution &amp; Executive Board</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Visual Grid of School Memories */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80"
                      alt="Assembly"
                      className="w-full h-48 object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80"
                      alt="Teachers Tribute"
                      className="w-full h-60 object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-8">
                  <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"
                      alt="Reunion Group"
                      className="w-full h-60 object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200">
                    <img
                      src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600&q=80"
                      alt="Computer Lab"
                      className="w-full h-48 object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            4. FEATURED ALUMNI DIRECTORY PREVIEW
        ========================================================= */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Global Directory
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Meet Our Distinguished Alumni
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  Discover classmates, industry pioneers, and fellow graduates making a proud impact across Bangladesh and abroad.
                </p>
              </div>

              <Link
                href="/alumni"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-semibold text-xs transition-colors shrink-0"
              >
                <span>Browse Full Directory (5,000+)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredAlumni.map((alumnus) => (
                <AlumniCard key={alumnus.id} alumni={alumnus} viewMode="grid" />
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            5. EXPLORE BATCHES (SSC 1985 - 2025)
        ========================================================= */}
        <section className="py-20 bg-slate-50 border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Four Decades of Brotherhood
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Explore by SSC Batch
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  Each batch has its own unique heritage, class representatives, reunion archives, and active discussions.
                </p>
              </div>

              <Link
                href="/batches"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-semibold text-xs transition-colors shrink-0"
              >
                <span>View All Batches (1985-2025)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredBatches.map((batch) => (
                <BatchCard key={batch.year} batch={batch} />
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            6. UPCOMING EVENTS & REUNIONS
        ========================================================= */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Connect &amp; Celebrate
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Upcoming Reunions &amp; Gatherings
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  From our signature annual mega-reunion to sports tournaments and career summits.
                </p>
              </div>

              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-semibold text-xs transition-colors shrink-0"
              >
                <span>See All Events</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            7. INSPIRATIONAL ALUMNI STORIES
        ========================================================= */}
        <section className="py-20 bg-[#06281e] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
                  Editorial Spotlight
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Stories That Inspire
                </h2>
                <p className="text-sm text-emerald-200 mt-1 max-w-xl">
                  Personal reflections, career journeys, and inspiring milestones from fellow alumni across the world.
                </p>
              </div>

              <Link
                href="/stories"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/60 font-semibold text-xs transition-colors shrink-0"
              >
                <span>Read All Stories</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            8. ACHIEVEMENTS (HALL OF FAME)
        ========================================================= */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Pride of Sabuj Shikshayatan
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Alumni Hall of Fame
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Honoring exceptional accomplishments in medicine, civil engineering, entrepreneurship, research, and governance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                        {ach.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Year {ach.yearAwarded}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <img
                        src={ach.photoUrl}
                        alt={ach.recipientName}
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-300"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900">{ach.recipientName}</div>
                        <div className="text-xs text-slate-500">SSC Batch &apos;{ach.batchYear}</div>
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-slate-800 leading-snug">
                      {ach.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200/80 text-[11px] text-emerald-800 font-semibold">
                    Conferred by {ach.organization}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/achievements"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>Explore Full Hall of Fame by Profession</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================
            9. GIVING BACK / DONATION HIGHLIGHT
        ========================================================= */}
        <section className="py-20 bg-emerald-950 text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
                  <Heart className="w-3.5 h-3.5 fill-amber-300" />
                  <span>Give Back to Alma Mater</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {featuredDonation.title}
                </h2>

                <p className="text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                  {featuredDonation.description}
                </p>

                {/* Progress bar */}
                <div className="space-y-2 max-w-lg">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-300">
                      Raised: ৳{featuredDonation.raisedAmount.toLocaleString()}
                    </span>
                    <span className="text-emerald-300">
                      Goal: ৳{featuredDonation.goalAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full h-3 bg-emerald-900 rounded-full overflow-hidden p-0.5 border border-emerald-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                      style={{
                        width: `${Math.min(
                          (featuredDonation.raisedAmount / featuredDonation.goalAmount) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-emerald-300">
                    <span>{featuredDonation.donorCount} Generous Donors</span>
                    <span>{featuredDonation.daysLeft} days remaining</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    href="/donate"
                    className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition-colors"
                  >
                    Contribute to Scholarship Fund
                  </Link>
                  <Link
                    href="/donate"
                    className="px-6 py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 font-semibold text-xs border border-emerald-700 transition-colors"
                  >
                    View All 4 Campaigns
                  </Link>
                </div>
              </div>

              {/* Donation Card */}
              <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-800">
                <h3 className="font-extrabold text-lg text-slate-900">Make an Impact Today</h3>
                <p className="text-xs text-slate-500 mt-1 mb-5">
                  Select a pledge amount. 100% of contributions are audited by the Alumni Executive Board.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {["৳500", "৳1,000", "৳5,000", "৳10,000"].map((amt, idx) => (
                    <button
                      key={amt}
                      className={`py-3 rounded-xl text-xs font-bold border transition-colors ${
                        idx === 2
                          ? "bg-emerald-800 text-white border-emerald-800 shadow-sm"
                          : "bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-600"
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                <Link
                  href="/donate"
                  className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Proceed to Donation Gateway</span>
                </Link>

                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Direct support via bKash, Nagad, Visa, Mastercard, and Bank Transfer
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            10. NOSTALGIC PHOTO MEMORIES PREVIEW
        ========================================================= */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  School Archives
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Treasured Moments in Time
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                  Step back into the verandas, green fields, and reunion celebrations that define Sabuj Shikshayatan.
                </p>
              </div>

              <Link
                href="/gallery"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 font-semibold text-xs transition-colors shrink-0"
              >
                <span>Open Full Photo Gallery</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {galleryPreview.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-64 bg-slate-900"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block mb-1">
                      {item.albumCategory}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            11. JOIN ALUMNI CALL TO ACTION
        ========================================================= */}
        <section className="py-20 bg-gradient-to-br from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center mx-auto shadow-xl">
              <GraduationCap className="w-8 h-8" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Ready to Reconnect with Your Alma Mater?
            </h2>

            <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Verify your SSC graduation records, reconnect with batchmates, participate in community discussions, and never miss an alumni event.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-xl transition-transform hover:-translate-y-0.5"
              >
                Start Alumni Registration
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 font-semibold text-sm transition-colors"
              >
                Existing Member Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
