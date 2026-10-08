"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import MyEvents from "@/components/events/MyEvents";
import {
  samplePosts,
  sampleAlumni,
  sampleBatches,
  sampleDonations,
  PostItem,
  type EventItem
} from "@/lib/data";
import {
  Sparkles,
  Calendar,
  Users,
  Heart,
  BadgeCheck,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Radio
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostItem[]>(samplePosts);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const user = session?.user;
  const userName = user?.name || "Md. Jashedul Islam";
  const userFirst = userName.split(" ")[0] || "Alumnus";
  const userBatch = user?.batchYear || 2008;
  const userRole = user?.role || "ALUMNI";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  // Membership status comes from the session; never label a pending or rejected
  // member as verified.
  const userStatus = user?.status || "PENDING";
  const isVerified = userStatus === "VERIFIED";
  const memberLabel = isAdmin
    ? "Administrator"
    : isVerified
      ? "Verified Member"
      : userStatus === "REJECTED"
        ? "Verification Not Approved"
        : "Verification Pending";
  const credentialsNote = isVerified
    ? "Verified credentials active"
    : userStatus === "REJECTED"
      ? "Contact the committee about your verification"
      : "Awaiting committee verification";
  const userAvatar = user?.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80";

  const [upcomingEvent, setUpcomingEvent] = useState<EventItem | null>(null);
  const [upcomingError, setUpcomingError] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch("/api/events", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Events request failed (${res.status})`);
        return res.json();
      })
      .then((body: { events: EventItem[] }) => setUpcomingEvent(body.events.find((e) => e.date >= today) ?? null))
      .catch(() => setUpcomingError(true));
  }, []);
  const [dynamicBatch, setDynamicBatch] = useState<{ totalAlumni: number; classRepresentative?: string } | null>(null);
  const [donationCampaign, setDonationCampaign] = useState<{ title: string; raisedAmount: number; goalAmount: number } | null>(null);
  const [realClassmates, setRealClassmates] = useState<typeof sampleAlumni>([]);

  useEffect(() => {
    // 1. Load batch info
    fetch("/api/batches", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.batches && Array.isArray(data.batches)) {
          const found = data.batches.find((b: { year: number }) => b.year === userBatch);
          if (found) setDynamicBatch(found);
        }
      })
      .catch(() => {});

    // 2. Load donation campaign
    fetch("/api/donations", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          setDonationCampaign(data.campaigns[0]);
        }
      })
      .catch(() => {});

    // 3. Load classmates from directory
    fetch(`/api/alumni?batch=${userBatch}&limit=6`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alumni && Array.isArray(data.alumni)) {
          const list = data.alumni.filter((a: { fullName: string }) => a.fullName !== userName);
          if (list.length > 0) setRealClassmates(list);
        }
      })
      .catch(() => {});
  }, [userBatch, userName]);

  const myBatch = {
    year: userBatch,
    name: `SSC Batch ${userBatch}`,
    totalAlumni: dynamicBatch?.totalAlumni ?? 0,
    classRepresentative: dynamicBatch?.classRepresentative || "Batch Committee",
    tagline: `Pride of Class of ${userBatch}`,
    representativePhone: "+880 1819-000000",
    coverImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80",
    description: `The proud alumni of SSC Batch ${userBatch}.`,
  };

  const activeDonation = donationCampaign || {
    title: "Student Merit & STEM Fund",
    raisedAmount: 0,
    goalAmount: 500000,
  };

  const displayClassmates = realClassmates.length > 0
    ? realClassmates.slice(0, 3)
    : sampleAlumni.filter((a) => a.fullName !== userName).slice(0, 3);

  const handlePostCreated = (content: string, batchTag?: number) => {
    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      author: {
        name: userName,
        avatar: userAvatar,
        batch: userBatch,
        profession: isAdmin ? "System Administrator" : "Active Alumnus",
        isVerified: true,
      },
      timestamp: "Just now",
      content,
      likesCount: 0,
      commentsCount: 0,
      batchTag: batchTag || userBatch,
      isLiked: false,
    };
    setPosts([newPost, ...posts]);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Authenticated Sidebar */}
      <AppSidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Alumni Dashboard" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Welcome Banner with Profile Strength */}
          <div className="bg-gradient-to-r from-[#06281e] via-[#0b3d2c] to-[#041a13] text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800/80 relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/90 text-amber-300 text-xs font-bold border border-amber-400/30">
                  {isAdmin || isVerified ? (
                    <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                  )}
                  <span>{memberLabel} • SSC Batch {userBatch}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, {userFirst}!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed">
                  {myBatch.totalAlumni > 0
                    ? `Your batch has ${myBatch.totalAlumni} connected alumni. `
                    : ""}
                  Stay updated with batchmates, participate in reunion votes, and discover mutual contacts.
                </p>
              </div>

              {/* Profile Completion Widget (90%) */}
              <div className="md:col-span-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Profile Strength</span>
                  <span className="text-amber-300">90% Complete</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full w-[90%]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-200">
                  <span>{credentialsNote}</span>
                  <Link href="/profile" className="text-white font-bold hover:underline">
                    Edit &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Create Post Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            {user?.image ? (
              <img
                src={user.image}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover border border-emerald-400"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-sm border border-emerald-600">
                {userFirst.charAt(0)}
              </div>
            )}
            <button
              onClick={() => setCreatePostOpen(true)}
              className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 text-xs transition-colors border border-slate-200"
            >
              Share a memory, career milestone, or batch meetup idea with the community...
            </button>
            <button
              onClick={() => setCreatePostOpen(true)}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Post</span>
            </button>
          </div>

          {/* 2-Column Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 cols: Community Feed & Batch updates */}
            <div className="lg:col-span-8 space-y-6">
              {/* Batch Highlight Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-900 text-amber-300 font-bold rounded-2xl flex items-center justify-center shrink-0">
                    &apos;{userBatch.toString().slice(-2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      SSC Batch {userBatch} Official Hub
                    </h3>
                    <p className="text-xs text-slate-500">
                      {myBatch.totalAlumni > 0 ? `${myBatch.totalAlumni} Members • ` : ""}Rep: {myBatch.classRepresentative}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/batches/${userBatch}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0 text-center"
                >
                  Open Batch Page
                </Link>
              </div>

              {/* Feed Heading */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-700 animate-pulse" />
                  <h3 className="font-bold text-base text-slate-900">Community Social Feed</h3>
                </div>
                <Link href="/feed" className="text-xs font-bold text-emerald-800 hover:underline">
                  View full feed &rarr;
                </Link>
              </div>

              {/* Posts */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>

            {/* Right 4 cols: Side widgets */}
            <div className="lg:col-span-4 space-y-6">
              {/* My Events */}
              <MyEvents />

              {/* Upcoming Event Widget */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Upcoming Reunion
                  </span>
                  <Link href="/events" className="text-[11px] text-slate-400 hover:text-slate-600">
                    All
                  </Link>
                </div>

                {upcomingError && (
                  <p role="alert" className="text-xs text-rose-700">
                    Couldn&apos;t load upcoming events. Please refresh the page to try again.
                  </p>
                )}

                {upcomingEvent && (
                  <>
                    <div className="rounded-xl overflow-hidden relative h-32 bg-slate-900">
                      <img
                        src={upcomingEvent.bannerImage}
                        alt={upcomingEvent.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                        <span className="text-[10px] font-bold text-amber-300 block">{upcomingEvent.date}</span>
                        <h4 className="text-xs font-bold line-clamp-1">{upcomingEvent.title}</h4>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {upcomingEvent.description}
                    </p>

                    <Link
                      href={`/events/${upcomingEvent.slug}`}
                      className="block text-center w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      View Details &amp; RSVP
                    </Link>
                  </>
                )}
              </div>

              {/* People You May Know */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" /> People You May Know
                  </span>
                  <Link href="/network" className="text-[11px] text-slate-400 hover:text-slate-600">
                    See All
                  </Link>
                </div>

                <div className="space-y-3">
                  {displayClassmates.map((alumnus) => (
                    <div key={alumnus.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img
                          src={alumnus.avatarUrl}
                          alt={alumnus.fullName}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                        <div className="truncate">
                          <Link href={`/profile?id=${alumnus.id}`} className="font-bold text-slate-900 hover:underline truncate block">
                            {alumnus.fullName}
                          </Link>
                          <span className="text-slate-400 text-[11px]">SSC &apos;{alumnus.sscBatch} • {alumnus.locationCity}</span>
                        </div>
                      </div>
                      <button className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold shrink-0 transition-colors">
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Giving Back Spotlight */}
              <div className="bg-[#06281e] text-white p-5 rounded-2xl border border-emerald-800 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-amber-300" /> Featured Campaign
                </span>
                <h4 className="font-bold text-sm leading-snug">{activeDonation.title}</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200">
                    <span>Raised: ৳{activeDonation.raisedAmount.toLocaleString()}</span>
                    <span>Goal: ৳{activeDonation.goalAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{
                        width: `${activeDonation.goalAmount > 0 ? Math.min(
                          (activeDonation.raisedAmount / activeDonation.goalAmount) * 100,
                          100
                        ) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <Link
                  href="/donate"
                  className="block text-center w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-colors"
                >
                  Give Back
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
