import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";
import { listPublishedNews } from "@/lib/news";
import { Newspaper } from "lucide-react";

// Published articles from the database; drafts never appear here.
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await listPublishedNews();
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Press &amp; Updates</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                School News &amp; Announcements
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Stay informed with official circulars, examination results, alumni committee bulletins, and development initiatives from Sabuj Shikshayatan Government High School.
              </p>
            </div>
          </div>
        </section>

        {/* News Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          {news.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No news yet</p>
              <p className="text-xs text-slate-500 mt-1">Announcements from the alumni committee will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {news.map((item) => (
                <NewsCard key={item.id} news={item} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
