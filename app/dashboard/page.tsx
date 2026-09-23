"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import {
  samplePosts,
  sampleEvents,
  sampleAlumni,
  sampleBatches,
  sampleDonations,
  PostItem
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
  const [posts, setPosts] = useState<PostItem[]>(samplePosts);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const upcomingEvent = sampleEvents[0];
  const myBatch = sampleBatches[1]; // Batch 2008
  const donationCampaign = sampleDonations[0];
  const suggestedClassmates = sampleAlumni.filter((a) => a.id !== "alm-1").slice(0, 3);

  const handlePostCreated = (content: string, batchTag?: number) => {
    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      author: {
        name: "Md. Jashedul Islam",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        batch: 2008,
        profession: "Lead Software Architect",
        isVerified: true,
      },
      timestamp: "Just now",
      content,
      likesCount: 0,
      commentsCount: 0,
      batchTag,
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
                  <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />
                  <span>Verified Member • SSC Batch 2008</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Welcome back, Jashedul!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed">
                  Your batch has 168 connected alumni. 4 classmates have posted recent updates and the Grand Reunion registration is underway.
                </p>
              </div>

              {/* Profile Completion Widget (85%) */}
              <div className="md:col-span-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Profile Strength</span>
                  <span className="text-amber-300">85% Complete</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full w-[85%]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-200">
                  <span>Add school club photos</span>
                  <Link href="/profile" className="text-white font-bold hover:underline">
                    Edit &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Create Post Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="You"
              className="w-10 h-10 rounded-full object-cover border border-emerald-400"
            />
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
                    &apos;08
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      SSC Batch 2008 Official Hub
                    </h3>
                    <p className="text-xs text-slate-500">
                      168 Members • Class Rep: Md. Jashedul Islam • Next Meetup: Nov 20
                    </p>
                  </div>
                </div>
                <Link
                  href="/batches/2008"
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
                  href={`/events/${upcomingEvent.id}`}
                  className="block text-center w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  View Details &amp; RSVP
                </Link>
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
                  {suggestedClassmates.map((alumnus) => (
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
                <h4 className="font-bold text-sm leading-snug">{donationCampaign.title}</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-200">
                    <span>Raised: ৳{donationCampaign.raisedAmount.toLocaleString()}</span>
                    <span>Goal: ৳{donationCampaign.goalAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{
                        width: `${Math.min(
                          (donationCampaign.raisedAmount / donationCampaign.goalAmount) * 100,
                          100
                        )}%`,
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
