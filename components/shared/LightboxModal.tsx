"use client";

import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Calendar, User, Tag } from "lucide-react";
import { GalleryPhotoItem } from "@/lib/data";

interface LightboxModalProps {
  photos: GalleryPhotoItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function LightboxModal({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onPrev,
  onNext,
}: LightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-50"
        aria-label="Close modal"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      <button
        onClick={onPrev}
        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 p-3 rounded-full transition-colors z-50"
        aria-label="Previous photo"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 p-3 rounded-full transition-colors z-50"
        aria-label="Next photo"
      >
        <ChevronRight className="w-7 h-7" />
      </button>

      {/* Main Image Container */}
      <div className="max-w-5xl w-full flex flex-col items-center">
        <div className="relative max-h-[75vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10">
          <img
            src={currentPhoto.imageUrl}
            alt={currentPhoto.title}
            className="max-h-[75vh] w-auto object-contain mx-auto"
          />
        </div>

        {/* Caption & Metadata */}
        <div className="mt-4 text-center max-w-2xl px-4 text-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800/80 text-emerald-200 border border-emerald-600/50 mb-2">
            <Tag className="w-3 h-3" />
            {currentPhoto.albumCategory}
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
            {currentPhoto.title}
          </h3>
          <p className="text-sm text-slate-300 mt-1">{currentPhoto.caption}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
            {currentPhoto.year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Year {currentPhoto.year}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Submitted by {currentPhoto.submittedBy}
            </span>
            <span>
              {currentIndex + 1} of {photos.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
