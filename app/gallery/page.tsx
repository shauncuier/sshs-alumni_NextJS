"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LightboxModal from "@/components/shared/LightboxModal";
import { sampleGallery } from "@/lib/data";
import { Image as ImageIcon, ZoomIn, Calendar, Filter } from "lucide-react";

export default function GalleryPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const categories = [
    "all",
    "School Memories",
    "Old Campus",
    "Reunions",
    "Sports",
    "Teachers",
    "Cultural Events",
  ];

  const filteredPhotos = sampleGallery.filter((p) => {
    if (selectedCategory !== "all" && p.albumCategory !== selectedCategory) return false;
    return true;
  });

  const handleOpenPhoto = (idx: number) => {
    setCurrentIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Nostalgia Archives</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                School Memories &amp; Photo Gallery
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                A visual journey through four decades of classroom laughter, sports tournaments, beloved teachers, and historic reunions at Sabuj Shikshayatan Government High School. Click any photo to view in high definition.
              </p>
            </div>
          </div>
        </section>

        {/* Category Filter Pills */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Album:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All Albums" : cat}
              </button>
            ))}
          </div>

          {/* Masonry-style Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredPhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => handleOpenPhoto(index)}
                className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 bg-slate-900 cursor-pointer h-72"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-3.5 left-3.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-semibold border border-white/10">
                  {photo.albumCategory}
                </div>

                {/* Hover zoom icon */}
                <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 p-2 rounded-full text-white shadow-md">
                  <ZoomIn className="w-4 h-4" />
                </div>

                {/* Bottom Caption */}
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                  <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-1">
                    {photo.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-1">{photo.caption}</p>
                  <div className="flex items-center gap-3 text-[10px] text-emerald-300 pt-1">
                    {photo.year && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Year {photo.year}
                      </span>
                    )}
                    <span>Submitted by {photo.submittedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      <LightboxModal
        photos={filteredPhotos}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setCurrentIndex((currentIndex - 1 + filteredPhotos.length) % filteredPhotos.length)}
        onNext={() => setCurrentIndex((currentIndex + 1) % filteredPhotos.length)}
      />
    </div>
  );
}
