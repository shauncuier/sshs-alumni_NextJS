"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import type { PostItem } from "@/lib/data";

interface FeedComment {
  id: string;
  authorName: string;
  authorBatch: number | null;
  content: string;
  createdAt: string;
  canDelete: boolean;
}

interface PostCardProps {
  post: PostItem;
  /** Called after the post was deleted, so the list can drop it. */
  onDeleted?: (id: string) => void;
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

/** A feed post with real likes and comments (stored via /api/posts). */
export default function PostCard({ post, onDeleted }: PostCardProps) {
  const [likes, setLikes] = useState(post.likesCount);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Sample posts (no author id) are display-only.
  const live = Boolean(post.authorId);
  const profileHref = post.profileId ? `/alumni/${post.profileId}` : "#";

  const toggleLike = async () => {
    if (!live) return;
    // Show the change at once; undo it if the server refuses.
    const was = isLiked;
    setIsLiked(!was);
    setLikes((n) => n + (was ? -1 : 1));
    try {
      const data = await call(`/api/posts/${post.id}/like`, "POST");
      setIsLiked(data.liked);
      setLikes(data.likesCount);
    } catch (err) {
      setIsLiked(was);
      setLikes((n) => n + (was ? 1 : -1));
      setError((err as Error).message);
    }
  };

  const openComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null && live) {
      try {
        setComments((await call(`/api/posts/${post.id}/comments`, "GET")).comments);
      } catch (err) {
        setError((err as Error).message);
        setComments([]);
      }
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInput.trim();
    if (!text || !live) return;
    setBusy(true);
    setError(null);
    try {
      const { comment } = await call(`/api/posts/${post.id}/comments`, "POST", { content: text });
      setComments((list) => [...(list ?? []), comment]);
      setCommentCount((n) => n + 1);
      setCommentInput("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (c: FeedComment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await call(`/api/comments/${c.id}`, "DELETE");
      setComments((list) => (list ?? []).filter((x) => x.id !== c.id));
      setCommentCount((n) => Math.max(0, n - 1));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removePost = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      await call(`/api/posts/${post.id}`, "DELETE");
      onDeleted?.(post.id);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={profileHref} className="shrink-0">
            <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-100 hover:border-emerald-600 transition-colors" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={profileHref} className="font-bold text-slate-900 hover:text-emerald-800 text-sm transition-colors">
                {post.author.name}
              </Link>
              {post.author.isVerified && <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white" />}
              {post.batchTag && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">SSC &apos;{post.batchTag}</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {post.author.profession} • <span>{post.timestamp}</span>
            </div>
          </div>
        </div>
        {post.canDelete && (
          <button type="button" onClick={() => void removePost()} disabled={busy} aria-label="Delete post" title="Delete post" className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">{post.content}</div>

      <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
        <button type="button" onClick={() => void toggleLike()} disabled={!live} aria-pressed={isLiked} className={`flex items-center gap-1.5 transition-colors font-medium cursor-pointer ${isLiked ? "text-rose-600 font-bold" : "hover:text-rose-600"}`}>
          <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-600" : ""}`} />
          <span>{likes} {likes === 1 ? "Like" : "Likes"}</span>
        </button>
        <button type="button" onClick={() => void openComments()} aria-expanded={showComments} className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors font-medium cursor-pointer">
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount} {commentCount === 1 ? "Comment" : "Comments"}</span>
        </button>
      </div>

      {error && <p role="alert" className="text-[11px] font-bold text-rose-700">{error}</p>}

      {showComments && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          {comments === null ? (
            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400">No comments yet.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900">
                      {c.authorName}
                      {c.authorBatch ? ` (SSC '${String(c.authorBatch).slice(-2)})` : ""}:{" "}
                    </span>
                    <span className="text-slate-700 break-words whitespace-pre-line">{c.content}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{c.createdAt}</span>
                  </div>
                  {c.canDelete && (
                    <button type="button" onClick={() => void removeComment(c)} aria-label="Delete comment" className="text-slate-300 hover:text-rose-600 shrink-0 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {live && (
            <form onSubmit={addComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentInput}
                maxLength={1000}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment…"
                aria-label="Write a comment"
                className="flex-1 px-3.5 py-2 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button type="submit" disabled={busy || !commentInput.trim()} className="p-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer" title="Post comment">
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
