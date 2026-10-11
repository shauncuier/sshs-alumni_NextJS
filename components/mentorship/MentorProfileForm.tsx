"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface MentorFormValues {
  id: string | null;
  status: string | null;
  rejectReason: string | null;
  designation: string;
  organization: string;
  domain: string;
  locationCity: string;
  bio: string;
  yearsOfExperience: string;
  availableDays: string;
  skills: string;
  topicsOffered: string;
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const STATUS: Record<string, { text: string; style: string }> = {
  PENDING: { text: "Waiting for the committee to approve your profile.", style: "bg-amber-50 border-amber-200 text-amber-900" },
  APPROVED: { text: "Your profile is listed on the Mentorship page.", style: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  PAUSED: { text: "Your profile is paused and hidden from the Mentorship page.", style: "bg-slate-100 border-slate-200 text-slate-700" },
  REJECTED: { text: "Your profile was not approved. Update it and save to send it for review again.", style: "bg-rose-50 border-rose-200 text-rose-900" },
};

export default function MentorProfileForm({ initial, domains }: { initial: MentorFormValues; domains: readonly string[] }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = (key: keyof MentorFormValues, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/mentorship/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: form.designation,
          organization: form.organization,
          domain: form.domain,
          locationCity: form.locationCity,
          bio: form.bio,
          yearsOfExperience: Number(form.yearsOfExperience),
          availableDays: lines(form.availableDays),
          skills: lines(form.skills),
          topicsOffered: lines(form.topicsOffered),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your profile.");
      setForm((f) => ({ ...f, id: data.mentor.id, status: data.mentor.status, rejectReason: null }));
      setNotice(data.mentor.status === "PENDING" ? "Saved. The committee will review your profile." : "Saved.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    if (!form.id) return;
    const action = form.status === "PAUSED" ? "RESUME" : "PAUSE";
    setSaving(true);
    setError(null);
    const res = await fetch("/api/mentorship/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, mentorId: form.id }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not change your listing.");
    setForm((f) => ({ ...f, status: data.mentor.status }));
  };

  const status = form.status ? STATUS[form.status] : null;

  return (
    <form onSubmit={save} className="space-y-4">
      {status && (
        <div className={`p-3.5 rounded-2xl border text-xs ${status.style} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
          <span>
            {status.text}
            {form.status === "REJECTED" && form.rejectReason ? ` Reason: ${form.rejectReason}` : ""}
          </span>
          {(form.status === "APPROVED" || form.status === "PAUSED") && (
            <button type="button" disabled={saving} onClick={() => void togglePause()} className="px-3 py-2 rounded-xl border border-current text-xs font-bold cursor-pointer w-fit">
              {form.status === "PAUSED" ? "Resume listing" : "Pause listing"}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="mp-title" className={label}>Job title *</label>
          <input id="mp-title" required maxLength={120} className={input} value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Senior Software Engineer" />
        </div>
        <div>
          <label htmlFor="mp-org" className={label}>Organization *</label>
          <input id="mp-org" required maxLength={200} className={input} value={form.organization} onChange={(e) => set("organization", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="mp-domain" className={label}>Field *</label>
          <select id="mp-domain" className={input} value={form.domain} onChange={(e) => set("domain", e.target.value)}>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mp-years" className={label}>Years of experience *</label>
          <input id="mp-years" required inputMode="numeric" className={input} value={form.yearsOfExperience} onChange={(e) => set("yearsOfExperience", e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </div>
        <div>
          <label htmlFor="mp-city" className={label}>City</label>
          <input id="mp-city" maxLength={120} className={input} value={form.locationCity} onChange={(e) => set("locationCity", e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="mp-bio" className={label}>About you *</label>
        <textarea id="mp-bio" required rows={5} maxLength={3000} className={input} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Your path since SSGHS and what you can help younger alumni with." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="mp-topics" className={label}>Topics you can help with * (one per line)</label>
          <textarea id="mp-topics" rows={4} className={input} value={form.topicsOffered} onChange={(e) => set("topicsOffered", e.target.value)} placeholder={"CV review\nBCS preparation"} />
        </div>
        <div>
          <label htmlFor="mp-skills" className={label}>Skills (one per line)</label>
          <textarea id="mp-skills" rows={4} className={input} value={form.skills} onChange={(e) => set("skills", e.target.value)} />
        </div>
        <div>
          <label htmlFor="mp-days" className={label}>When you are usually free (one per line)</label>
          <textarea id="mp-days" rows={4} className={input} value={form.availableDays} onChange={(e) => set("availableDays", e.target.value)} placeholder={"Friday evening\nSaturday morning"} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Your name, SSC batch and photo come from your member profile. Requests are emailed to you; you decide which to accept.</p>
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-xs font-bold text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {notice}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="submit" disabled={saving} className="px-5 py-3 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {form.id ? "Save profile" : "Apply to be a mentor"}
        </button>
        {form.id && <Link href="/mentorship/mine" className="px-5 py-3 min-h-[44px] border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center">See my requests</Link>}
      </div>
    </form>
  );
}
