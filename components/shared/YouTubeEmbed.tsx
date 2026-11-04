"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * A YouTube video that loads only when tapped: until then it is one thumbnail image,
 * so a page stays light on mobile data. The player is youtube-nocookie.com (allowed
 * in the CSP's frame-src, next.config.mjs).
 */
export default function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#072a1f] shadow-lg shadow-emerald-950/10">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 w-full h-full cursor-pointer" aria-label={`Play video: ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-300 text-[#072a1f] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
            <Play className="w-7 h-7 ml-1" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
