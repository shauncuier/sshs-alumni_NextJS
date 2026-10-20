import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { pageMetadata, shareCard } from "@/lib/seo";
import { Download, FileText, HelpCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  image: shareCard("events"),
  path: "/guide",
  title: "Registration Guide & Video Tutorial",
  description: "Official step-by-step registration guide and video tutorial for SSGHS alumni Golden Jubilee 2026 and lifetime membership.",
});

export default function GuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Header Breadcrumbs & Title */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <Link href="/register" className="hover:underline">Register</Link>
            <span>/</span>
            <span className="text-slate-500">Registration Guide</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Online Registration Guide & Video Tutorial
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                অনলাইন নিবন্ধন নির্দেশিকা ও ভিডিও টিউটোরিয়াল · Golden Jubilee 2026
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="/docs/ssghs-registration-guide.pdf"
                download="SSGHS-Registration-Guide.pdf"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Guide</span>
              </a>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-sm transition-all"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Video Tutorial Card */}
        <section className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl text-white">
          <div className="p-4 sm:p-6 pb-2 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white font-black text-xs">
                ▶
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold">Watch Video Walkthrough</h2>
                <p className="text-xs text-slate-400">ধাপভিত্তিক ভিডিও টিউটোরিয়াল (Full HD · 44 sec)</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              Official Tutorial
            </span>
          </div>

          <div className="p-3 sm:p-6 bg-black flex justify-center">
            <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/videos/registration-guide-thumb.jpg"
                className="w-full h-full object-contain"
              >
                <source src="/videos/registration-guide.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Video Chapters */}
          <div className="p-4 sm:p-6 bg-slate-900/60 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Video Chapters & Timestamps (ভিডিও অধ্যায়সমূহ)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:00</span>
                <span>Overview & Jubilee</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:06</span>
                <span>Step 1: Personal & Batch Info</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:13</span>
                <span>Step 2: Photo & Proof Upload</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:21</span>
                <span>Step 3 & 4: bKash/Nagad Pay</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:30</span>
                <span>Step 5: Digital ID Card & Ticket</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-2">
                <span className="font-mono text-amber-400 font-bold shrink-0">0:38</span>
                <span>Helpline & Support</span>
              </div>
            </div>
          </div>
        </section>

        {/* PDF Guide Callout Banner */}
        <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-200 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              <span>Official 4-Page PDF Document</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Download Printable Registration Guide (PDF)</h2>
            <p className="text-xs sm:text-sm text-emerald-100">
              ৪ পাতার পূর্ণাঙ্গ রঙিন নির্দেশিকা ডাউনলোড করুন। এতে রয়েছে প্রতিটি ধাপের বিস্তারিত ব্যাখ্যা, ছবির সাইজ, বিকাশ/নগদে ফি পাঠানোর নিয়ম এবং কিউআর কোড।
            </p>
          </div>
          <a
            href="/docs/ssghs-registration-guide.pdf"
            download="SSGHS-Registration-Guide.pdf"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-sm shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-800" />
            <span>Download PDF (1.5 MB)</span>
          </a>
        </section>

        {/* Step-by-Step Walkthrough Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Step-by-Step Instructions (ধাপে ধাপে নির্দেশনা)
          </h2>

          {/* Step 1 */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold text-xs">
                01
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 1: Personal & Academic Information (ব্যক্তিগত ও শিক্ষাগত তথ্য)</h3>
                <p className="text-xs text-slate-500">আপনার প্রাথমিক পরিচয় ও ব্যাচ সংক্রান্ত তথ্য পূরণ করুন</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <p className="font-bold text-slate-800">নাম ও এসএসসি ব্যাচ</p>
                <p>সার্টিফিকেট অনুযায়ী আপনার পূর্ণ নাম ইংরেজিতে লিখুন এবং ১৯৭৭ থেকে ২০২৬ পর্যন্ত তালিকার মধ্য থেকে আপনার এসএসসি পাশের বছর বাছাই করুন।</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <p className="font-bold text-slate-800">মোবাইল নম্বর ও পাসওয়ার্ড</p>
                <p>আপনার সচল ফোন নম্বর ও ন্যূনতম ৬ অক্ষরের পাসওয়ার্ড দিন। এই নম্বর ও পাসওয়ার্ড দিয়েই পরবর্তীতে লগইন করে মেম্বার কার্ড দেখতে পারবেন।</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold text-xs">
                02
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 2: Profile Photo & Academic Document (ছবি ও প্রামাণ্য নথি আপলোড)</h3>
                <p className="text-xs text-slate-500">পরিচয় নিশ্চিতকরণ ও ডিজিটাল আইডি কার্ড তৈরির জন্য প্রয়োজনীয় ফাইল</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <p className="font-bold text-slate-800">১. পাসপোর্ট সাইজের ছবি</p>
                <p>ন্যূনতম ৬০০ × ৬০০ পিক্সেলের পাসপোর্ট সাইজের একক ছবি (সর্বোচ্চ ৫ MB)। এটি আপনার ডিজিটাল কার্ডে প্রদর্শিত হবে।</p>
                <p className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px]">
                  💡 <strong>iPhone/HEIC ব্যবহারকারী:</strong> ছবির স্ক্রিনশট নিয়ে সেই স্ক্রিনশটটি আপলোড করুন।
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <p className="font-bold text-slate-800">২. শিক্ষার্থী প্রমাণপত্র (যেকোনো একটি)</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>এসএসসি মূল সনদ (SSC Certificate)</li>
                  <li>এসএসসি মার্কশিট বা একাডেমিক ট্রান্সক্রিপ্ট</li>
                  <li>এসএসসি রেজিস্ট্রেশন বা এডমিট কার্ড</li>
                  <li>স্কুল ত্যাগের প্রশংসাপত্র (Testimonial)</li>
                </ul>
                <p className="text-slate-500 text-[11px]">ফরম্যাট: PDF বা স্পষ্ট ছবি (সর্বোচ্চ ১০ MB)।</p>
              </div>
            </div>
          </div>

          {/* Step 3 & 4 */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold text-xs">
                03
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 3 & 4: Package, Sizes & Payment (প্যাকেজ, সাইজ ও পেমেন্ট)</h3>
                <p className="text-xs text-slate-500">টি-শার্টের সাইজ নির্বাচন এবং বিকাশ/নগদে ফি পরিশোধ</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <p className="font-bold text-slate-800">টি-শার্ট সাইজ ও অতিথি</p>
                <p>আপনার উপযোগী টি-শার্ট সাইজ (S: 38&quot;, M: 40&quot;, L: 42&quot;, XL: 44&quot;, XXL: 46&quot;) বাছাই করুন। সাথে পরিবার বা অতিথি থাকলে তাদের টিকিট সংখ্যা যুক্ত করুন।</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <p className="font-bold text-slate-800">বিকাশ / নগদ পেমেন্ট ও TrxID</p>
                <p>প্রদর্শিত নম্বরে ফি পাঠিয়ে এসএমএস থেকে Transaction ID (TrxID) ফর্মে লিখুন। পেমেন্টের স্ক্রিনশট আপলোড করলে আমাদের স্মার্ট OCR সিস্টেম স্বয়ংক্রিয়ভাবে ট্রানজেকশন মিলিয়ে নেবে।</p>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-800 text-white font-extrabold text-xs">
                04
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Step 5: Verification & Digital Alumni Card (অনুমোদন ও টিকিট সংগ্রহ)</h3>
                <p className="text-xs text-slate-500">কমিটি কর্তৃক যাচাই শেষে আপনার ডিজিটাল মেম্বার কার্ড ও কিউআর এন্ট্রি টিকিট প্রাপ্তি</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1.5">
              <p className="font-bold">যাচাইকরণ সময়কাল: ২৪ থেকে ৪৮ ঘণ্টা</p>
              <p>কমিটি তথ্য ও পেমেন্ট নিশ্চিত করলেই আপনার মোবাইল নম্বরে নিশ্চিতকরণ এসএমএস যাবে। এরপর আপনি ওয়েবসাইটে লগইন করে ড্যাশবোর্ড থেকে আপনার <strong>অফিসিয়াল ডিজিটাল আইডি কার্ড</strong> এবং <strong>গোল্ডেন জুবিলি কিউআর এন্ট্রি টিকিট</strong> সংগ্রহ করতে পারবেন।</p>
            </div>
          </div>
        </section>

        {/* Real UI Screenshots Gallery Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Real Portal UI Screenshots (ওয়েবসাইটের আসল স্ক্রিনশট)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                রেজিস্ট্রেশনের প্রতিটি ধাপে ওয়েবসাইট দেখতে কেমন হবে তা একনজরে দেখে নিন
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
              Live System Interface
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Screenshot 1 */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-2 p-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-slate-800">ধাপ ১: ব্যক্তিগত তথ্য ও ব্যাচ নির্বাচন</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Step 1 UI</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                <img
                  src="/docs/ui-screenshots/ui_step1_account.png"
                  alt="Step 1 Account Details Form"
                  className="w-full h-auto object-cover max-h-[380px] object-top hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[11px] text-slate-500 px-2">নাম, এসএসসি ব্যাচ, রোল, রক্তের গ্রুপ এবং পাসওয়ার্ড ইনপুট স্ক্রিন।</p>
            </div>

            {/* Screenshot 2 */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-2 p-3">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-slate-800">ধাপ ৩ ও ৪: টি-শার্ট ও বিকাশ/নগদ পেমেন্ট</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Payment UI</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                <img
                  src="/docs/ui-screenshots/ui_step2_payment.png"
                  alt="Step 2 Payment and TrxID Form"
                  className="w-full h-auto object-cover max-h-[380px] object-top hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[11px] text-slate-500 px-2">প্যাকেজ নির্বাচন, টি-শার্টের সাইজ ও TrxID প্রদান স্ক্রিন।</p>
            </div>

            {/* Screenshot 3 */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-2 p-3 sm:col-span-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-slate-800">ধাপ ৫: ডিজিটাল মেম্বারশিপ আইডি কার্ড ও কিউআর টিকিট প্রিভিউ</span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Digital ID Card</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-900">
                <img
                  src="/docs/ui-screenshots/ui_card_preview.png"
                  alt="Digital Alumni ID Card Preview"
                  className="w-full h-auto max-h-[320px] object-cover object-top hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-[11px] text-slate-500 px-2">অনুমোদনের পর ড্যাশবোর্ডে প্রদর্শিত অফিসিয়াল ডিজিটাল কার্ড ও ভেন্যু এন্ট্রি টিকিটের আসল রূপ।</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-800" />
            <h2 className="text-lg font-bold text-slate-900">Frequently Asked Questions (সাধারণ জিজ্ঞাসা)</h2>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-700">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <p className="font-bold text-slate-900">প্রশ্ন: ভুলবশত ভুল তথ্য বা ভুল TrxID সাবমিট করলে কী করণীয়?</p>
              <p className="text-slate-600">উত্তর: আপনি যদি পেমেন্টের স্পষ্ট স্ক্রিনশট আপলোড করে থাকেন, তবে কমিটি স্ক্রিনশট দেখে ম্যানুয়ালি যাচাই করে দেবে। প্রয়োজনে কমিটির হেল্পলাইন নম্বরে যোগাযোগ করতে পারেন।</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <p className="font-bold text-slate-900">প্রশ্ন: আমি কি একই ফোনে একাধিক ব্যাচমেটের রেজিস্ট্রেশন করে দিতে পারব?</p>
              <p className="text-slate-600">উত্তর: হ্যাঁ, একটি রেজিস্ট্রেশন সম্পন্ন করার পর পুনরায় <code>/register</code> এ গিয়ে নতুন সদস্যের ফোন নম্বর ও তথ্য দিয়ে আরেকটি অ্যাকাউন্ট নিবন্ধন করা যাবে।</p>
            </div>
          </div>
        </section>

        {/* CTA Bar */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4 shadow-lg">
          <h2 className="text-xl sm:text-2xl font-black">সবুজ শিক্ষায়তনের ৫০ বছর পূর্তি উৎসবে আপনাকে স্বাগতম</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
            আসুন শৈশবের প্রিয় প্রাঙ্গণে, প্রিয় শিক্ষক এবং সহপাঠীদের সাথে স্মৃতি রোমন্থন করি।
          </p>
          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition"
            >
              এখনই রেজিস্ট্রেশন করুন (Register Online)
            </Link>
            <a
              href="/docs/ssghs-registration-guide.pdf"
              download="SSGHS-Registration-Guide.pdf"
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition"
            >
              পিডিএফ গাইড ডাউনলোড করুন
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
