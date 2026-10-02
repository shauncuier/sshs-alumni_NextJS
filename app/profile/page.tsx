"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Camera,
  Trash2,
  Upload,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  User,
  X,
  Plus
} from "lucide-react";

interface ProfileRecord {
  fullName: string;
  sscBatch: number;
  rollNumber: string | null;
  section: string | null;
  profession: string;
  company: string | null;
  industry: string | null;
  locationCity: string;
  locationCountry: string;
  bio: string | null;
  phone: string | null;
  isPhonePublic: boolean;
  isEmailPublic: boolean;
  avatarUrl: string | null;
  avatarOriginalUrl: string | null;
  coverUrl: string | null;
  skills: unknown;
  linkedin: string | null;
  facebook: string | null;
  github: string | null;
  website: string | null;
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
  industry: string;
  locationCity: string;
  locationCountry: string;
  rollNumber: string;
  section: string;
  phone: string;
  isPhonePublic: boolean;
  isEmailPublic: boolean;
  bio: string;
  skills: string[];
  skillsInput: string;
  linkedin: string;
  facebook: string;
  github: string;
  website: string;
  schoolMemories: string;
  contributions: string;
}

const INDUSTRIES = [
  "Information Technology & Software",
  "Medicine, Healthcare & Pharma",
  "Civil Service & Government",
  "Banking, Finance & Investment",
  "Education & Academic Research",
  "Engineering & Construction",
  "Business, Trade & Entrepreneurship",
  "Law & Legal Services",
  "Media, Journalism & Arts",
  "Armed Forces & Defense",
  "Other Sector",
];

function toForm(profile: ProfileRecord): ProfileForm {
  const skillsArr = Array.isArray(profile.skills)
    ? profile.skills.filter((skill): skill is string => typeof skill === "string")
    : [];
  return {
    fullName: profile.fullName,
    profession: profile.profession,
    company: profile.company ?? "",
    industry: profile.industry ?? "",
    locationCity: profile.locationCity,
    locationCountry: profile.locationCountry || "Bangladesh",
    rollNumber: profile.rollNumber ?? "",
    section: profile.section ?? "",
    phone: profile.phone ?? "",
    isPhonePublic: Boolean(profile.isPhonePublic),
    isEmailPublic: Boolean(profile.isEmailPublic),
    bio: profile.bio ?? "",
    skills: skillsArr,
    skillsInput: skillsArr.join(", "),
    linkedin: profile.linkedin ?? "",
    facebook: profile.facebook ?? "",
    github: profile.github ?? "",
    website: profile.website ?? "",
    schoolMemories: profile.schoolMemories ?? "",
    contributions: profile.contributions ?? "",
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

  // Avatar upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError("Please select a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("The photo must be 5 MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile photo.");

      setProfile((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl, avatarOriginalUrl: data.originalUrl } : prev));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setAvatarError((err as Error).message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove photo.");
      setProfile((prev) => (prev ? { ...prev, avatarUrl: null, avatarOriginalUrl: null } : prev));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setAvatarError((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData) return;
    setSaving(true);
    setSaveError(null);

    const parsedSkills = profileData.skillsInput
      ? profileData.skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : profileData.skills;

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData,
          skills: parsedSkills,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save your profile.");
      setProfile(body.profile);
      setProfileData(toForm(body.profile));
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
          {avatarError && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold">
              {avatarError}
            </div>
          )}
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Your profile information and photo have been successfully updated!</span>
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
                    if (typeof window !== "undefined") {
                      navigator.clipboard?.writeText(window.location.href);
                      alert("Profile link copied to clipboard!");
                    }
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
                {/* Avatar with Image Edit & Upload Option */}
                <div className="relative group">
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-emerald-900">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profileData.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full text-amber-300 font-black text-4xl flex items-center justify-center">
                        {profileData.fullName.charAt(0)}
                      </div>
                    )}

                    {/* Camera / Edit Image Overlay */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity ${
                        uploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      title="Upload new profile picture"
                    >
                      <Camera className="w-6 h-6 text-amber-300" />
                      <span className="text-[10px] font-bold tracking-tight">
                        {uploadingAvatar ? "Uploading…" : "Change Photo"}
                      </span>
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />

                  {/* Quick Photo Actions under Avatar */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{uploadingAvatar ? "Uploading…" : "Edit Photo"}</span>
                    </button>
                    {profile.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isVerified && (
                    <span className="absolute top-1 right-1 bg-emerald-600 text-white p-1 rounded-full ring-2 ring-white shadow" title="Verified Alumnus">
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
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs ${
                      isEditing
                        ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                        : "bg-emerald-800 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" /> {isEditing ? "Close Editor" : "Edit All Info"}
                  </button>
                  <Link
                    href="/messages"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Messages
                  </Link>
                </div>
              </div>

              {/* Title & Subtitle */}
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6 pt-2">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      You can update any of your personal, professional, academic, contact, and nostalgia details below.
                    </span>
                  </div>

                  {/* Section 1: Personal & Career Information */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      1. Personal &amp; Career Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Profession / Designation *</label>
                        <input
                          type="text"
                          value={profileData.profession}
                          onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                          placeholder="e.g. Lead Software Architect, Consultant Cardiologist"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Current Organization / Company</label>
                        <input
                          type="text"
                          value={profileData.company}
                          onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                          placeholder="e.g. Google, Chittagong Medical College, Ministry of Finance"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Industry / Sector</label>
                        <select
                          value={profileData.industry}
                          onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        >
                          <option value="">Select industry or sector</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind} value={ind}>
                              {ind}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Location & Contact Privacy */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      2. Location &amp; Contact Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City / Town *</label>
                        <input
                          type="text"
                          value={profileData.locationCity}
                          onChange={(e) => setProfileData({ ...profileData, locationCity: e.target.value })}
                          placeholder="e.g. Chattogram, Dhaka, London, New York"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={profileData.locationCountry}
                          onChange={(e) => setProfileData({ ...profileData, locationCountry: e.target.value })}
                          placeholder="e.g. Bangladesh, United Kingdom, Canada"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number</label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          placeholder="+880 1711-000000"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-center gap-2 pt-2 sm:pt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={profileData.isPhonePublic}
                            onChange={(e) => setProfileData({ ...profileData, isPhonePublic: e.target.checked })}
                            className="rounded text-emerald-700 border-slate-300 focus:ring-emerald-600"
                          />
                          <span>Show phone number to verified alumni</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
                          <input
                            type="checkbox"
                            checked={profileData.isEmailPublic}
                            onChange={(e) => setProfileData({ ...profileData, isEmailPublic: e.target.checked })}
                            className="rounded text-emerald-700 border-slate-300 focus:ring-emerald-600"
                          />
                          <span>Show email address in directory</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Academic Record */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      3. School Academic Record (SSGHS)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">SSC Batch Year</label>
                        <input
                          type="text"
                          disabled
                          value={`SSC ${userBatch}`}
                          className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-500 font-bold cursor-not-allowed"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Batch year is verified on record</span>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">School Roll Number</label>
                        <input
                          type="text"
                          value={profileData.rollNumber}
                          onChange={(e) => setProfileData({ ...profileData, rollNumber: e.target.value })}
                          placeholder="e.g. 104, 12"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Section / Group</label>
                        <input
                          type="text"
                          value={profileData.section}
                          onChange={(e) => setProfileData({ ...profileData, section: e.target.value })}
                          placeholder="e.g. Section A (Science), Section B"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Bio & Skills */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      4. Bio &amp; Professional Skills
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Professional Bio / Summary</label>
                        <textarea
                          rows={3}
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          placeholder="Introduce yourself to classmates and fellow alumni..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Skills &amp; Expertise (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={profileData.skillsInput}
                          onChange={(e) => setProfileData({ ...profileData, skillsInput: e.target.value })}
                          placeholder="e.g. Cardiothoracic Surgery, React, FinTech, Public Policy, Corporate Law"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">Separate skills with commas (e.g. Leadership, Python, Cloud)</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Online Profiles */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      5. Social &amp; Professional Links
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">LinkedIn Profile URL</label>
                        <input
                          type="url"
                          value={profileData.linkedin}
                          onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/username"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Facebook Profile URL</label>
                        <input
                          type="url"
                          value={profileData.facebook}
                          onChange={(e) => setProfileData({ ...profileData, facebook: e.target.value })}
                          placeholder="https://facebook.com/username"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">GitHub / Portfolio URL</label>
                        <input
                          type="url"
                          value={profileData.github}
                          onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
                          placeholder="https://github.com/username"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Personal / Company Website</label>
                        <input
                          type="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 6: School Memories & Contributions */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
                      6. School Memories &amp; Alma Mater Contributions
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">School Memories &amp; Nostalgia (&apos;সবুজ পদাবলি&apos;)</label>
                        <textarea
                          rows={2}
                          value={profileData.schoolMemories}
                          onChange={(e) => setProfileData({ ...profileData, schoolMemories: e.target.value })}
                          placeholder="Share a favorite memory, beloved teacher or campus moment from SSGHS..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Contributions to School / Community</label>
                        <textarea
                          rows={2}
                          value={profileData.contributions}
                          onChange={(e) => setProfileData({ ...profileData, contributions: e.target.value })}
                          placeholder="e.g. Scholarship donor, Batch event organizer, Mentorship coach..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" /> {saving ? "Saving Updates…" : "Save All Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileData(toForm(profile));
                        setIsEditing(false);
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
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
                      {profile.industry ? ` (${profile.industry})` : ""}
                    </span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profileData.locationCity}, {profileData.locationCountry}
                    </span>
                    {profile.phone && profile.isPhonePublic && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {profile.phone}
                      </span>
                    )}
                    {memberSince && (
                      <>
                        <span>•</span>
                        <span>Member since {memberSince}</span>
                      </>
                    )}
                  </div>

                  {/* Social and Web Links */}
                  {(profile.linkedin || profile.facebook || profile.github || profile.website) && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {profile.linkedin && (
                        <a
                          href={profile.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> LinkedIn
                        </a>
                      )}
                      {profile.facebook && (
                        <a
                          href={profile.facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-sky-200 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> Facebook
                        </a>
                      )}
                      {profile.github && (
                        <a
                          href={profile.github}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-300 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" /> GitHub
                        </a>
                      )}
                      {profile.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Website
                        </a>
                      )}
                    </div>
                  )}
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
                  {profileData.bio || "No bio yet. Click 'Edit All Info' to add one."}
                </p>
              </div>

              {/* School Memories & Nostalgia */}
              {profile.schoolMemories && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>School Memories &amp; Nostalgia (&apos;সবুজ স্মৃতি&apos;)</span>
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
                    {profile.industry && (
                      <div className="text-[11px] text-slate-500">{profile.industry}</div>
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
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Class of {userBatch}
                      {profile.section ? ` • Section: ${profile.section}` : ""}
                      {profile.rollNumber ? ` • Roll: ${profile.rollNumber}` : ""}
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
