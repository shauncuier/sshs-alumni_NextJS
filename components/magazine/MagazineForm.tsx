"use client";

import React, { useState } from "react";
import { CheckCircle2, Phone, Send } from "lucide-react";
import { MAGAZINE_CALL as CALL } from "@/lib/magazine-call";

const field = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1";
const MAX = 20_000;

/** The public form for souvenir-book writings (no sign-in): posts to /api/magazine. */
export default function MagazineForm() {
  const [form, setForm] = useState({ name: "", batch: "", phone: "", email: "", title: "", content: "", website: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/magazine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "লেখাটি পাঠানো যায়নি। আবার চেষ্টা করুন।");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "লেখাটি পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      <aside className="lg:col-span-2 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-3xl border border-emerald-700 shadow-sm p-5 sm:p-6 space-y-4 self-start">
        <h2 className="text-base sm:text-lg font-black text-amber-300 leading-snug">{CALL.title}</h2>
        <p className="text-sm leading-relaxed text-emerald-50">{CALL.body}</p>
        <p className="text-xs text-emerald-100">
          শুভেচ্ছান্তে-
          <br />
          <span className="font-bold text-white">{CALL.convenor}</span>
          <br />
          {CALL.role}
          <br />
          {CALL.council}
        </p>
        <a href={CALL.phoneHref} className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-emerald-100 hover:bg-emerald-700/60 border border-emerald-600">
          <Phone className="w-4 h-4" />
          মোবাইলঃ {CALL.phone}
        </a>
      </aside>

      <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8">
        {sent ? (
          <div role="status" className="text-center py-10 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-black text-slate-900">আপনার লেখা পৌঁছেছে</h2>
            <p className="text-sm text-slate-600">ধন্যবাদ। প্রকাশনা উপকমিটি লেখাটি স্মরণিকার জন্য বিবেচনা করবে এবং প্রয়োজনে আপনার সাথে যোগাযোগ করবে।</p>
            <button type="button" onClick={() => { setSent(false); setForm((f) => ({ ...f, title: "", content: "" })); }} className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer">
              আরেকটি লেখা পাঠান
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">আপনার লেখা পাঠান</h2>
              <p className="text-xs text-slate-500 mt-1">লগইন লাগবে না। প্রাক্তন ও বর্তমান সবুজিয়ান এবং শিক্ষকমন্ডলী সবাই লিখতে পারেন।</p>
            </div>
            {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="mg-name" className={label}>আপনার নাম *</label>
                <input id="mg-name" name="name" value={form.name} onChange={set("name")} required maxLength={120} className={field} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="mg-batch" className={label}>এসএসসি ব্যাচ (ঐচ্ছিক)</label>
                <input id="mg-batch" name="batch" value={form.batch} onChange={set("batch")} inputMode="numeric" placeholder="যেমন 1998" maxLength={4} className={field} />
              </div>
              <div>
                <label htmlFor="mg-phone" className={label}>মোবাইল নম্বর</label>
                <input id="mg-phone" name="phone" value={form.phone} onChange={set("phone")} inputMode="tel" placeholder="01XXXXXXXXX" maxLength={40} className={field} autoComplete="tel" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mg-email" className={label}>ইমেইল (মোবাইল না দিলে)</label>
                <input id="mg-email" name="email" type="email" value={form.email} onChange={set("email")} maxLength={254} className={field} autoComplete="email" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mg-title" className={label}>লেখার শিরোনাম (ঐচ্ছিক)</label>
                <input id="mg-title" name="title" value={form.title} onChange={set("title")} maxLength={200} className={field} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="mg-content" className={label}>আপনার লেখা *</label>
                <textarea id="mg-content" name="content" value={form.content} onChange={set("content")} required maxLength={MAX} rows={12} placeholder="স্মৃতিচারণ, গল্প, কবিতা…" className={`${field} resize-y`} />
                <p className="text-[11px] text-slate-400 mt-1 text-right">{form.content.length.toLocaleString("en-US")} / {MAX.toLocaleString("en-US")}</p>
              </div>
            </div>
            {/* Honeypot: hidden from people, filled in by bots; the server drops such submissions. */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
              <label htmlFor="mg-website">Website</label>
              <input id="mg-website" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" />
            </div>
            <button type="submit" disabled={sending} className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              <Send className="w-4 h-4" />
              {sending ? "পাঠানো হচ্ছে…" : "লেখা পাঠান"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
