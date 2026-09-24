"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Image, Tag, Send, CheckCircle2 } from "lucide-react";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (content: string, batchTag: number | undefined) => void;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Verified Alumnus";
  const userBatch = session?.user?.batchYear || 2008;
  const userImage = session?.user?.image;

  const [content, setContent] = useState("");
  const [batchTag, setBatchTag] = useState(userBatch.toString());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user?.batchYear) {
      setBatchTag(session.user.batchYear.toString());
    }
  }, [session?.user?.batchYear]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      onPostCreated(content.trim(), batchTag && batchTag !== "all" ? parseInt(batchTag, 10) : undefined);
      setContent("");
      setSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">Create Community Post</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {userImage ? (
              <img
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
                  value={batchTag}
                  onChange={(e) => setBatchTag(e.target.value)}
                  className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]"
                >
                  <option value={userBatch.toString()}>Batch {userBatch}</option>
                  <option value="all">Public All Batches</option>
                </select>
              </div>
            </div>
          </div>

          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, throwback photo, career milestone, or batch meetup idea..."
            className="w-full text-sm placeholder-slate-400 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
            required
            autoFocus
          />

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Attach media:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg border border-slate-200 text-xs flex items-center gap-1 transition-colors"
              >
                <Image className="w-3.5 h-3.5 text-emerald-600" /> Photo
              </button>
            </div>
          </div>

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
