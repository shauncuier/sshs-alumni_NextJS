"use client";

import React, { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import PostCard from "@/components/feed/PostCard";
import CreatePostModal from "@/components/feed/CreatePostModal";
import { samplePosts, PostItem } from "@/lib/data";
import { Plus, Radio, Layers, Sparkles, Filter } from "lucide-react";

export default function FeedPage() {
  const [posts, setPosts] = useState<PostItem[]>(samplePosts);
  const [filter, setFilter] = useState<"all" | "my-batch" | "official">("all");
  const [createPostOpen, setCreatePostOpen] = useState(false);

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

  const filteredPosts = posts.filter((post) => {
    if (filter === "my-batch") return post.batchTag === 2008;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Community Social Feed" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          {/* Top Post Creator Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="You"
              className="w-10 h-10 rounded-full object-cover border border-emerald-400"
            />
            <button
              onClick={() => setCreatePostOpen(true)}
              className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 text-xs transition-colors border border-slate-200"
            >
              Share updates, throwback photos, or announcements with fellow alumni...
            </button>
            <button
              onClick={() => setCreatePostOpen(true)}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Post</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                filter === "all"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All Community
            </button>
            <button
              onClick={() => setFilter("my-batch")}
              className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                filter === "my-batch"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              My Batch (SSC 2008)
            </button>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
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
