import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Tag, User } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getPublishedNews } from "@/lib/news";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getPublishedNews((await params).id);
  if (!article) return { title: "News not found" };
  return { title: `${article.title} | SSGHS Alumni News`, description: article.excerpt };
}

export default async function NewsArticlePage({ params }: Props) {
  const article = await getPublishedNews((await params).id);
  if (!article) notFound();

  // Plain text: blank lines start a new paragraph; nothing is rendered as HTML.
  const paragraphs = article.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-6">
          <Link href="/news" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4" /> All news
          </Link>

          <header className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Tag className="w-3.5 h-3.5" /> {article.category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {article.date}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {article.author}
              </span>
            </div>
          </header>

          <img src={article.featuredImage} alt="" className="w-full rounded-3xl border border-slate-200 bg-slate-100 object-cover max-h-[480px]" />

          <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">{article.excerpt}</p>
          <div className="space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
