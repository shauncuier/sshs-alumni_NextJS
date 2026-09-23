import React from "react";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Quote } from "lucide-react";
import { AlumniStoryItem } from "@/lib/data";

interface StoryCardProps {
  story: AlumniStoryItem;
}

export default function StoryCard({ story }: StoryCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      {/* Cover Image */}
      <div className="relative h-52 overflow-hidden bg-slate-900">
        <img
          src={story.coverImage}
          alt={story.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Batch Stamp */}
        <div className="absolute top-3 left-3 bg-[#06281e]/90 backdrop-blur-md px-3 py-1 rounded-xl text-amber-300 font-extrabold text-[11px] border border-amber-400/40">
          SSC Batch &apos;{story.batchYear}
        </div>

        {/* Read Time */}
        <div className="absolute bottom-3 right-3 text-white/90 text-xs bg-black/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{story.readTime}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            {story.profession} • {story.currentOrganization}
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug line-clamp-2">
            {story.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
            {story.summary}
          </p>

          {story.quote && (
            <div className="bg-emerald-50/70 border-l-3 border-emerald-600 p-3 rounded-r-xl text-xs italic text-emerald-950 mt-3 flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
              <span className="line-clamp-2">&ldquo;{story.quote}&rdquo;</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">{story.authorName}</span>
            <span className="text-slate-400">{story.publishedDate}</span>
          </div>
          <Link
            href={`/stories/${story.id}`}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
          >
            <span>Read Story</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
