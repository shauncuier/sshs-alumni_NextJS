"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  BadgeCheck,
  Send,
  MoreHorizontal
} from "lucide-react";
import { PostItem } from "@/lib/data";

interface PostCardProps {
  post: PostItem;
}

export default function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likesCount);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [comments, setComments] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleLike = () => {
    if (isLiked) {
      setLikes(likes - 1);
      setIsLiked(false);
    } else {
      setLikes(likes + 1);
      setIsLiked(true);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setComments([...comments, commentInput.trim()]);
    setCommentInput("");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
      {/* Post Author Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/profile`}>
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-100 hover:border-emerald-600 transition-colors"
            />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/profile`}
                className="font-bold text-slate-900 hover:text-emerald-800 text-sm transition-colors"
              >
                {post.author.name}
              </Link>
              {post.author.isVerified && (
                <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />
              )}
              {post.batchTag && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                  SSC &apos;{post.batchTag}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {post.author.profession} • <span>{post.timestamp}</span>
            </div>
          </div>
        </div>

        <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Post Body Content */}
      <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
        {post.content}
      </div>

      {/* Post Images if any */}
      {post.images && post.images.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-slate-100 max-h-96 bg-slate-950">
          <img
            src={post.images[0]}
            alt="Community Post Attachment"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Counters & Action Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 transition-colors font-medium ${
              isLiked ? "text-rose-600 font-bold" : "hover:text-rose-600"
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-600" : ""}`} />
            <span>{likes} Likes</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.commentsCount + comments.length} Comments</span>
          </button>

          <button className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors font-medium hidden sm:flex">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        <button
          onClick={() => setSaved(!saved)}
          className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
            saved ? "text-amber-500" : "text-slate-400 hover:text-slate-600"
          }`}
          title="Save Post"
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-amber-500" : ""}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {/* Mock comment threads */}
          <div className="space-y-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-900">Dr. Nusrat Jahan (SSC &apos;06): </span>
              <span className="text-slate-700">Count me in! Really looking forward to meeting everyone after so long.</span>
            </div>
            {comments.map((c, i) => (
              <div key={i} className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-950">You: </span>
                <span className="text-slate-800">{c}</span>
              </div>
            ))}
          </div>

          {/* Add comment box */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment or warm memory..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0 shadow-sm"
              title="Post Comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
