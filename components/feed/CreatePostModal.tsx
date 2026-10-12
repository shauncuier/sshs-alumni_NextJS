"use client";

import { useEscapeKey } from "@/components/shared/useEscapeKey";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { X, Image as Send } from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Saves the post; throws with a message if it was not saved. */
  onPostCreated: (content: string, batchTag: number | undefined) => Promise<void> | void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Member";
  const userBatch = session?.user?.batchYear;
  const userImage = session?.user?.image;

  const [content, setContent] = useState("");
  const [batchTag, setBatchTag] = useState<string | null>(null);
  const effectiveBatchTag = batchTag ?? (userBatch ? String(userBatch) : "all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onPostCreated(content.trim(), effectiveBatchTag && effectiveBatchTag !== "all" ? parseInt(effectiveBatchTag, 10) : undefined);
      setContent("");
      setBatchTag(null);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div role="dialog" aria-modal="true" aria-label="Create community post" className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Create Community Post</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
          <div className="flex items-center gap-3">
            {userImage ? (
              <img loading="lazy" decoding="async"
                src={userImage}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover border border-emerald-300"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-sm border border-emerald-600">
                {userName.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-semibold text-xs text-slate-900">{userName}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>Posting as SSC Batch</span>
                <select
                  value={effectiveBatchTag}
                  onChange={(e) => setBatchTag(e.target.value)}
                  className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]"
                >
                  {userBatch && <option value={String(userBatch)}>Batch {userBatch}</option>}
                  <option value="all">Public All Batches</option>
                </select>
              </div>
            </div>
          </div>

          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, a memory, a career milestone or a batch meetup idea…"
            className="w-full text-sm placeholder-slate-400 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
            required
            autoFocus
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2 text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Publishing..." : "Post to Community"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
