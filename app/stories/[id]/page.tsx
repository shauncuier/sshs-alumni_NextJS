"use client";

import React, { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sampleStories } from "@/lib/data";
import { ArrowLeft, Clock, Calendar, Quote, Share2, User } from "lucide-react";

interface StoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryDetailPage({ params }: StoryDetailPageProps) {
  const resolvedParams = use(params);
  const story = sampleStories.find((s) => s.id === resolvedParams.id);
  // An unknown id shows the 404 page, never a different story.
  if (!story) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Editorial Header */}
        <div className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Link
              href="/stories"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All Stories
            </Link>

            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider">
                SSC Batch &apos;{story.batchYear} Feature
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                {story.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-200 pt-2 border-t border-emerald-800/80">
                <span className="font-bold text-white text-sm">{story.authorName}</span>
                <span>•</span>
                <span>{story.profession} ({story.currentOrganization})</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {story.publishedDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {story.readTime}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Editorial Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
          <article className="bg-white p-6 sm:p-12 rounded-3xl border border-slate-200/80 shadow-md space-y-8">
            {/* Featured Image */}
            <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
              <img
                src={story.coverImage}
                alt={story.title}
                className="w-full h-[400px] object-cover"
              />
            </div>

            {/* Pull Quote */}
            {story.quote && (
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-6 rounded-r-2xl my-6">
                <Quote className="w-6 h-6 text-emerald-700 mb-2" />
                <p className="text-base sm:text-lg font-bold text-emerald-950 italic leading-relaxed">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <span className="text-xs text-emerald-800 font-semibold mt-2 block">
                  — {story.authorName}, SSC Batch &apos;{story.batchYear}
                </span>
              </div>
            )}

            {/* Body Text */}
            <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
              <p>{story.summary}</p>
              <p className="whitespace-pre-line">{story.fullStory}</p>
            </div>

            {/* Author Bio Box */}
            <div className="pt-8 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-bold text-lg">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{story.authorName}</h4>
                  <p className="text-xs text-slate-500">
                    SSC Batch {story.batchYear} • {story.profession}
                  </p>
                </div>
              </div>

              <Link
                href={`/alumni?q=${encodeURIComponent(story.authorName)}`}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                View Profile &amp; Connect
              </Link>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
