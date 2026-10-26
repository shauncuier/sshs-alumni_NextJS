import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, FileText, User } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getActiveNotice, PRIORITY_BADGE } from "@/lib/notices";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const notice = await getActiveNotice(id).catch(() => null);
  if (!notice) return { title: "Notice not found", robots: { index: false } };
  return pageMetadata({ path: `/notices/${id}`, title: notice.title, description: notice.content, type: "article", image: null });
}

export default async function NoticePage({ params }: Props) {
  const notice = await getActiveNotice((await params).id).catch(() => null);
  if (!notice) notFound();

  // Plain text: blank lines start a new paragraph; nothing is rendered as HTML.
  const paragraphs = notice.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const badge = PRIORITY_BADGE[notice.priority];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-6">
          <Link href="/notices" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4" /> Notice board
          </Link>

          <header className="space-y-3">
            {badge && <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${badge.className}`}>{badge.label}</span>}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">{notice.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-600" /> {notice.date}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {notice.author}</span>
            </div>
          </header>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-slate-700 leading-relaxed whitespace-pre-line">{p}</p>
            ))}
          </div>

          {notice.attachmentUrl && (
            <a href={notice.attachmentUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold">
              <FileText className="w-4 h-4" /> Open the attached PDF
            </a>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
