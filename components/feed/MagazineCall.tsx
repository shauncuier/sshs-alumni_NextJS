import React from "react";
import { BookOpenText, PenLine, Phone } from "lucide-react";

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
          <h2 id="magazine-call-title" className="text-base sm:text-lg font-black text-amber-300 leading-snug">সুবর্ণজয়ন্তী স্মরণিকার জন্য লেখা আহ্বান</h2>
          <p className="text-[11px] text-emerald-200 mt-0.5">আপনার লেখা এখানে পোস্ট করুন; প্রকাশনা উপকমিটি স্মরণিকার জন্য সংগ্রহ করবে।</p>
        </div>
      </div>

      <div className="text-sm leading-relaxed text-emerald-50 space-y-3">
        <p>
          প্রিয় প্রাক্তন সবুজিয়ানবৃন্দ- অফুরান শুভেচ্ছা রইলো। প্রিয় বিদ্যাপীঠের ৫০ বছর পূর্তি উপলক্ষ্যে সুবর্ণজয়ন্তী উদযাপন উৎসব দরজায় কড়া নাড়ছে। অতি আনন্দের সাথে জানাচ্ছি যে, সুবর্ণজয়ন্তী উপলক্ষ্যে প্রকাশনা উপকমিটি একটি স্মরণিকা স্মারক গ্রন্থ রচনা এবং উন্মোচনের সিদ্ধান্ত গ্রহণ করেছে। সাবেক ও বর্তমান সকল সবুজিয়ান এবং শ্রদ্বেয় শিক্ষকমন্ডলীর কাছে থেকে আমরা লেখা, স্মৃতিচারণমূলক গল্প, কবিতা ইত্যাদি আহ্বান করছি। আমাদের প্রাণের উৎসবে সবার উপস্থিতিতে প্রিয় স্কুল প্রাঙ্গণ হয়ে উঠুক মিলনমেলার হৃদবাগিচা।
        </p>
        <p className="text-xs text-emerald-100">
          শুভেচ্ছান্তে-
          <br />
          <span className="font-bold text-white">প্রত্যুষ রুবেল</span>
          <br />
          আহ্বায়ক, প্রকাশনা উপকমিটি
          <br />
          সুবর্ণজয়ন্তী উদযাপন পরিষদ
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
        <a href="tel:+8801818869523" className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-emerald-100 hover:bg-emerald-700/60 flex items-center justify-center gap-1.5 border border-emerald-600">
          <Phone className="w-4 h-4" />
          মোবাইলঃ 01818-869523
        </a>
      </div>
    </section>
  );
}
