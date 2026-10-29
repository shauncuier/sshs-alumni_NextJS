import React from "react";
import Link from "next/link";
import { BookOpenText, PenLine, Phone } from "lucide-react";
import { MAGAZINE_CALL as CALL } from "@/lib/magazine-call";

/**
 * The publication subcommittee's call for writings for the Golden Jubilee
 * souvenir book (স্মরণিকা). Shown on the feed, where members post the pieces
 * the committee later collects from /admin/feed ("Magazine text").
 */
export default function MagazineCall({ onWrite }: { onWrite: () => void }) {
  return (
    <section aria-labelledby="magazine-call-title" className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-3xl border border-emerald-700 shadow-sm p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
          <BookOpenText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 id="magazine-call-title" className="text-base sm:text-lg font-black text-amber-300 leading-snug">{CALL.title}</h2>
          <p className="text-[11px] text-emerald-200 mt-0.5">আপনার লেখা এখানে পোস্ট করুন; প্রকাশনা উপকমিটি স্মরণিকার জন্য সংগ্রহ করবে।</p>
        </div>
      </div>

      <div className="text-sm leading-relaxed text-emerald-50 space-y-3">
        <p>{CALL.body}</p>
        <p className="text-xs text-emerald-100">
          শুভেচ্ছান্তে-
          <br />
          <span className="font-bold text-white">{CALL.convenor}</span>
          <br />
          {CALL.role}
          <br />
          {CALL.council}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onWrite}
          className="px-4 py-2.5 min-h-[44px] bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <PenLine className="w-4 h-4" />
          আপনার লেখা পোস্ট করুন
        </button>
        <a href={CALL.phoneHref} className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-emerald-100 hover:bg-emerald-700/60 flex items-center justify-center gap-1.5 border border-emerald-600">
          <Phone className="w-4 h-4" />
          মোবাইলঃ {CALL.phone}
        </a>
      </div>
      <p className="text-[11px] text-emerald-200">
        সদস্য নন এমন কেউ (শিক্ষক, বর্তমান ছাত্র) লিখতে চাইলে এই লিংকটি দিন:{" "}
        <Link prefetch={false} href={CALL.publicPath} className="font-bold text-amber-300 hover:underline">exsabujian.org{CALL.publicPath}</Link>
      </p>
    </section>
  );
}
