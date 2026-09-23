import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StoryCard from "@/components/stories/StoryCard";
import { sampleStories } from "@/lib/data";
import { BookOpen } from "lucide-react";

export default function StoriesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Editorial Narratives</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Stories That Inspire
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Reflections, breakthroughs, and lifelong bonds forged at Sabuj Shikshayatan Government High School. Discover how former students are changing lives in science, healthcare, entrepreneurship, and public service.
              </p>
            </div>
          </div>
        </section>

        {/* Stories Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sampleStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
