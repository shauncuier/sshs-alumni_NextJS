"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import {
  BadgeCheck,
  Briefcase,
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  Globe,
  Share2,
  Edit,
  Save,
  CheckCircle2,
  Heart,
  Calendar,
  Building,
  Award,
  Sparkles
} from "lucide-react";

interface ProfileRecord {
  fullName: string;
  sscBatch: number;
  rollNumber: string | null;
  section: string | null;
  profession: string;
  company: string | null;
  locationCity: string;
  locationCountry: string;
  bio: string | null;
  phone: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  skills: unknown;
  schoolMemories: string | null;
  contributions: string | null;
}

interface AccountRecord {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Batchmate {
  id: string;
  userId: string;
  fullName: string;
  profession: string;
  avatarUrl: string | null;
}

interface ProfileForm {
  fullName: string;
  profession: string;
  company: string;
  locationCity: string;
  locationCountry: string;
  phone: string;
  bio: string;
  skills: string[];
}

function toForm(profile: ProfileRecord): ProfileForm {
  return {
    fullName: profile.fullName,
    profession: profile.profession,
    company: profile.company ?? "",
    locationCity: profile.locationCity,
    locationCountry: profile.locationCountry,
    phone: profile.phone ?? "",
    bio: profile.bio ?? "",
    skills: Array.isArray(profile.skills)
      ? profile.skills.filter((skill): skill is string => typeof skill === "string")
      : [],
  };
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  // The member's own record from the database; nothing here comes from sample data.
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [profileData, setProfileData] = useState<ProfileForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batchmates, setBatchmates] = useState<Batchmate[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load your profile.");
        if (!body.profile) throw new Error("Your profile has not been created yet.");
        setProfile(body.profile);
        setAccount(body.user);
        setProfileData(toForm(body.profile));
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const userBatch = profile?.sscBatch ?? user?.batchYear ?? 2008;

  // Real verified batchmates from the directory, excluding the member themself.
  useEffect(() => {
    if (!profile) return;
    fetch(`/api/alumni?batch=${profile.sscBatch}&verified=true`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { alumni: [] }))
      .then((body: { alumni?: Batchmate[] }) =>
        setBatchmates((body.alumni ?? []).filter((a) => a.userId !== account?.id).slice(0, 3))
      )
      .catch(() => setBatchmates([]));
  }, [profile, account?.id]);

  // Status from the database (fresh), not the sign-in session, which can be stale.
  const role = account?.role ?? user?.role ?? "ALUMNI";
  const status = account?.status ?? user?.status ?? "PENDING";
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isVerified = status === "VERIFIED";
  const statusLabel = isAdmin
    ? "Platform Admin"
    : isVerified
      ? "Verified Member"
      : status === "REJECTED"
        ? "Verification Not Approved"
        : "Verification Pending";
  const memberSince = account ? new Date(account.createdAt).getFullYear() : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save your profile.");
      setProfile(body.profile);
      setProfileData(toForm(body.profile));
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !profileData) {
    return (
      <div className="min-h-screen flex bg-[#f8fafc]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
          <AppHeader title="My Profile" />
          <main className="flex-1 p-8 max-w-5xl w-full mx-auto">
            <p
              className={`text-sm ${loadError ? "text-rose-700" : "text-slate-500"}`}
              role={loadError ? "alert" : "status"}
            >
              {loadError ?? "Loading your profile…"}
            </p>
          </main>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="My Profile" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {saveError && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Your profile information has been successfully updated and saved!</span>
            </div>
          )}

          {/* Main Profile Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Cover Banner */}
            <div className="h-44 sm:h-56 bg-gradient-to-r from-emerald-950 via-emerald-800 to-[#041a13] relative overflow-hidden">
              {profile.coverUrl && (
                <img
                  src={profile.coverUrl}
                  alt="Profile Cover"
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    alert("Profile link copied to clipboard!");
                  }}
                  className="px-3 py-1.5 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Profile
                </button>
              </div>
            </div>

            {/* Avatar & Header Details */}
            <div className="px-6 sm:px-8 pb-8 pt-0">
              <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div className="relative">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profileData.fullName}
                      className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-white shadow-xl"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-emerald-900 text-amber-300 font-black text-4xl flex items-center justify-center border-4 border-white shadow-xl">
                      {profileData.fullName.charAt(0)}
                    </div>
                  )}
                  {isVerified && (
                    <span className="absolute bottom-1 right-1 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-white shadow" title="Verified Alumnus">
                      <BadgeCheck className="w-5 h-5 fill-emerald-600 text-white" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-end">
                  <button
                    onClick={() => {
                      if (isEditing) setProfileData(toForm(profile));
                      setIsEditing(!isEditing);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" /> {isEditing ? "Cancel" : "Edit Profile"}
                  </button>
                  <Link
                    href="/messages"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    Send Message
                  </Link>
                </div>
              </div>

              {/* Title & Subtitle */}
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Profession</label>
                      <input
                        type="text"
                        value={profileData.profession}
                        onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Current Organization / Company</label>
                      <input
                        type="text"
                        value={profileData.company}
                        onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">City / Location</label>
                      <input
                        type="text"
                        value={profileData.locationCity}
                        onChange={(e) => setProfileData({ ...profileData, locationCity: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Bio / Summary</label>
                      <textarea
                        rows={3}
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileData(toForm(profile));
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {profileData.fullName}
                    </h1>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full border border-emerald-300">
                      SSC Batch {userBatch}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      {(isAdmin || isVerified) && <BadgeCheck className="w-4 h-4 text-emerald-600" />} {statusLabel}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {profileData.profession}
                      {profileData.company ? ` at ${profileData.company}` : ""}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profileData.locationCity}, {profileData.locationCountry}
                    </span>
                    {memberSince && (
                      <>
                        <span>•</span>
                        <span>Member since {memberSince}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Content Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Detailed Sections */}
            <div className="lg:col-span-8 space-y-6">
              {/* About / Bio */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">About</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {profileData.bio || "No bio yet. Use Edit Profile to add one."}
                </p>
              </div>

              {/* School Memories & Nostalgia */}
              {profile.schoolMemories && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>School Memories &amp; Nostalgia</span>
                </div>
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs sm:text-sm text-emerald-950 leading-relaxed italic">
                  &ldquo;{profile.schoolMemories}&rdquo;
                </div>
              </div>
              )}

              {/* Career & Experience */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span>Experience &amp; Career Trajectory</span>
                </h3>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="pt-3 first:pt-0 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{profileData.profession}</h4>
                    {profileData.company && (
                      <div className="text-xs text-emerald-800 font-semibold">{profileData.company}</div>
                    )}
                    <div className="text-[11px] text-slate-400">Current Role</div>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <span>Education</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100">
                  <div className="pt-2 first:pt-0">
                    <h4 className="font-bold text-sm text-slate-900">
                      Secondary School Certificate (SSC)
                    </h4>
                    <div className="text-xs text-emerald-800 font-semibold">
                      Sabuj Shikshayatan Government High School
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Class of {userBatch}
                      {profile.section ? ` • Section ${profile.section}` : ""}
                      {profile.rollNumber ? ` • Roll ${profile.rollNumber}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {profileData.skills.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-slate-900">Skills &amp; Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* Right 4 cols: Side widgets */}
            <div className="lg:col-span-4 space-y-6">
              {/* Batch Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                    &apos;{userBatch.toString().slice(-2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">SSC Batch {userBatch}</h4>
                  </div>
                </div>
                <Link
                  href={`/batches/${userBatch}`}
                  className="block text-center w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  View Batch Showcase
                </Link>
              </div>

              {/* Alumni Contributions */}
              {profile.contributions && (
              <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-amber-300" />
                  <span>Alma Mater Impact</span>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  {profile.contributions}
                </p>
              </div>
              )}

              {/* People From the Same Batch */}
              {batchmates.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    From SSC Batch {userBatch}
                  </h4>
                  <div className="space-y-3">
                    {batchmates.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          {a.avatarUrl ? (
                            <img
                              src={a.avatarUrl}
                              alt={a.fullName}
                              className="w-8 h-8 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-900 text-amber-300 font-bold flex items-center justify-center">
                              {a.fullName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{a.fullName}</div>
                            <div className="text-[10px] text-slate-400">{a.profession}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
