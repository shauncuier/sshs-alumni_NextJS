import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import prisma from "@/lib/prisma";
import {
  BadgeCheck,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Building,
  Mail,
  Phone,
  Globe,
  ArrowLeft,
  Share2,
  Award,
  BookOpen,
  Heart,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await prisma.alumniProfile.findFirst({
    where: {
      OR: [{ id }, { userId: id }],
      verificationStatus: "VERIFIED",
    },
    select: { fullName: true, profession: true, sscBatch: true },
  });

  if (!profile) return { title: "Alumni Not Found | SSGHS Alumni" };
  return {
    title: `${profile.fullName} (SSC '${profile.sscBatch}) | SSGHS Alumni`,
    description: `${profile.fullName}, ${profile.profession}. SSGHS Batch of ${profile.sscBatch} Alumni Profile.`,
  };
}

function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    // ignore
  }
  return undefined;
}

export default async function AlumniIndividualPage({ params }: Props) {
  const { id } = await params;

  const profile = await prisma.alumniProfile.findFirst({
    where: {
      OR: [{ id }, { userId: id }],
      verificationStatus: "VERIFIED",
    },
    select: {
      id: true,
      userId: true,
      fullName: true,
      sscBatch: true,
      graduationYear: true,
      rollNumber: true,
      section: true,
      profession: true,
      company: true,
      industry: true,
      locationCity: true,
      locationCountry: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      skills: true,
      linkedin: true,
      facebook: true,
      github: true,
      website: true,
      schoolMemories: true,
      contributions: true,
      phone: true,
      isPhonePublic: true,
      isEmailPublic: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          role: true,
        },
      },
    },
  });

  if (!profile) notFound();

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    profile.fullName
  )}&background=06281e&color=fcd34d&bold=true&size=256`;
  const avatarSrc = profile.avatarUrl || fallbackAvatar;

  const skillsList = Array.isArray(profile.skills)
    ? profile.skills.filter((s): s is string => typeof s === "string")
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* Cover Section */}
        <div className="relative h-64 md:h-80 w-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 overflow-hidden">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Profile Cover"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
          )}

          <div className="absolute top-6 left-4 sm:left-8 z-10">
            <Link
              href="/alumni"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-semibold transition-all border border-white/10 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Link>
          </div>

          <div className="absolute bottom-4 right-4 sm:right-8 z-10 flex gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-amber-300 border border-amber-400/20 text-xs font-bold shadow-sm">
              SSC Batch &apos;{profile.sscBatch}
            </span>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-24 sm:-mt-28 mb-8">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <div className="relative shrink-0">
                    <img
                      src={avatarSrc}
                      alt={profile.fullName}
                      className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl object-cover border-4 border-white shadow-xl ring-2 ring-emerald-500/20"
                    />
                    <span
                      className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1 rounded-full ring-4 ring-white shadow-md"
                      title="Verified Sabuj Shikshayatan Alumnus"
                    >
                      <BadgeCheck className="w-5 h-5 fill-emerald-600 text-white" />
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {profile.fullName}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Member
                      </span>
                    </div>

                    <p className="text-emerald-800 font-semibold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{profile.profession}</span>
                      {profile.company && (
                        <span className="text-slate-500 font-normal">at {profile.company}</span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {profile.locationCity}, {profile.locationCountry}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        Graduation Year: {profile.graduationYear}
                      </span>
                      {profile.section && (
                        <span className="inline-flex items-center gap-1">
                          Section: {profile.section}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social & Contact Actions */}
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 pt-4 md:pt-0">
                  {safeHref(profile.linkedin) && (
                    <a
                      href={safeHref(profile.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors shadow-sm"
                      title="LinkedIn"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6Z"/></svg>
                    </a>
                  )}
                  {safeHref(profile.github) && (
                    <a
                      href={safeHref(profile.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors shadow-sm"
                      title="GitHub"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"/></svg>
                    </a>
                  )}
                  {safeHref(profile.facebook) && (
                    <a
                      href={safeHref(profile.facebook)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors shadow-sm"
                      title="Facebook"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                    </a>
                  )}
                  {safeHref(profile.website) && (
                    <a
                      href={safeHref(profile.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors shadow-sm"
                      title="Website"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {profile.isEmailPublic && profile.user.email && (
                    <a
                      href={`mailto:${profile.user.email}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grid of Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Bio, Memories, Contributions */}
            <div className="lg:col-span-2 space-y-6">
              {/* About / Bio */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" /> About
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {profile.bio || "No biography shared yet."}
                </p>
              </div>

              {/* School Memories */}
              {profile.schoolMemories && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" /> School Memories
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-line">
                    &ldquo;{profile.schoolMemories}&rdquo;
                  </p>
                </div>
              )}

              {/* Contributions */}
              {profile.contributions && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> Contributions & Support
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {profile.contributions}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Key Details & Skills */}
            <div className="space-y-6">
              {/* Profile Overview Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Academic & Professional Details
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">SSC Batch</span>
                    <span className="font-bold text-emerald-800">Class of {profile.sscBatch}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-400 font-medium">Graduation Year</span>
                    <span className="font-semibold text-slate-800">{profile.graduationYear}</span>
                  </div>

                  {profile.industry && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Industry</span>
                      <span className="font-semibold text-slate-800">{profile.industry}</span>
                    </div>
                  )}

                  {profile.locationCity && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Location</span>
                      <span className="font-semibold text-slate-800">
                        {profile.locationCity}, {profile.locationCountry}
                      </span>
                    </div>
                  )}

                  {profile.isPhonePublic && profile.phone && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400 font-medium">Phone</span>
                      <span className="font-semibold text-slate-800">{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Card */}
              {skillsList.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">
                    Skills & Expertise
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
