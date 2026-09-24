"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { sampleAlumni, sampleBatches } from "@/lib/data";
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

export default function ProfilePage() {
  const { data: session } = useSession();

  const user = session?.user;
  const userName = user?.name || "Md. Jashedul Islam";
  const userBatch = user?.batchYear || 2008;
  const userRole = user?.role || "ALUMNI";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isVerified = user?.status !== "PENDING";

  // Find matching alumnus in sample data if any, else default to current user state
  const matchedAlumnus = sampleAlumni.find(
    (a) => a.fullName.toLowerCase() === userName.toLowerCase() || a.email === user?.email
  ) || sampleAlumni[0];

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: userName,
    profession: isAdmin ? "System Administrator & Tech Consultant" : matchedAlumnus.profession,
    company: matchedAlumnus.company || "Leading Enterprise",
    locationCity: matchedAlumnus.locationCity || "Chittagong",
    locationCountry: matchedAlumnus.locationCountry || "Bangladesh",
    phone: matchedAlumnus.phone || "+880 1819-987654",
    email: user?.email || matchedAlumnus.email,
    bio: matchedAlumnus.bio || "Proud alumnus of Sabuj Shikshayatan Government High School.",
    skills: matchedAlumnus.skills || ["Technology", "Leadership", "Mentorship"],
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setProfileData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const sameBatchAlumni = sampleAlumni.filter(
    (a) => a.sscBatch === userBatch && a.fullName.toLowerCase() !== userName.toLowerCase()
  );
  const displayBatchmates = sameBatchAlumni.length > 0 ? sameBatchAlumni : sampleAlumni.slice(1, 4);

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="My Profile" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
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
              <img
                src={matchedAlumnus.coverUrl}
                alt="Profile Cover"
                className="w-full h-full object-cover opacity-60"
              />
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
                  {user?.image ? (
                    <img
                      src={user.image}
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
                    onClick={() => setIsEditing(!isEditing)}
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
                      className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4" /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
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
                      <BadgeCheck className="w-4 h-4 text-emerald-600" /> {isAdmin ? "Platform Admin" : "Verified Member"}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileData.profession} at {profileData.company}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profileData.locationCity}, {profileData.locationCountry}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-800 font-semibold">
                      128 Connections
                    </span>
                    <span>•</span>
                    <span>Member since 2024</span>
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
                  {profileData.bio}
                </p>
              </div>

              {/* School Memories & Nostalgia */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>School Memories &amp; Nostalgia</span>
                </div>
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs sm:text-sm text-emerald-950 leading-relaxed italic">
                  &ldquo;{matchedAlumnus.schoolMemories || "Cherished memories from the classrooms and sports field of Sabuj Shikshayatan Government High School."}&rdquo;
                </div>
              </div>

              {/* Career & Experience */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-700" />
                  <span>Experience &amp; Career Trajectory</span>
                </h3>

                <div className="space-y-4 divide-y divide-slate-100">
                  <div className="pt-3 first:pt-0 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{profileData.profession}</h4>
                    <div className="text-xs text-emerald-800 font-semibold">{profileData.company} • Active</div>
                    <div className="text-[11px] text-slate-400">Current Role</div>
                    <p className="text-xs text-slate-600 mt-1">
                      Professional contributions, engineering initiatives, and leadership within the industry.
                    </p>
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
                    <div className="text-[11px] text-slate-400">Class of {userBatch} • Science / General Group</div>
                  </div>
                </div>
              </div>

              {/* Skills */}
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
                    <p className="text-[11px] text-slate-400">142 Alumni Members</p>
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
              <div className="bg-emerald-950 text-white p-6 rounded-3xl border border-emerald-800 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-amber-300" />
                  <span>Alma Mater Impact</span>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  {matchedAlumnus.contributions || "Supporter of School Development & Alumni Reunion Scholarship Fund."}
                </p>
              </div>

              {/* People From the Same Batch */}
              {displayBatchmates.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    From SSC Batch {userBatch}
                  </h4>
                  <div className="space-y-3">
                    {displayBatchmates.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={a.avatarUrl}
                            alt={a.fullName}
                            className="w-8 h-8 rounded-full object-cover border"
                          />
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
