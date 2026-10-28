"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { schoolInfo } from "@/lib/data";
import { MapPin, Phone, Mail, Send, CheckCircle2, Globe } from "lucide-react";
import FacebookIcon from "@/components/shared/FacebookIcon";

const SUBJECTS = [
  "General question",
  "Joining & verification",
  "Events & sponsorship",
  "Donations",
  "Batch representative",
];
const field = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block font-semibold text-slate-700 mb-1";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", batch: "", email: "", phone: "", subject: SUBJECTS[0], message: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Sent to POST /api/contact: emailed to the committee's inbox and kept in the activity log.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const details = [form.batch.trim() && `SSC batch: ${form.batch.trim()}`, form.phone.trim() && `Phone: ${form.phone.trim()}`].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, subject: form.subject, message: details ? `${details}\n\n${form.message}` : form.message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Your message could not be sent. Please try again.");
      setReference(data.ticketId ?? data.reference ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Mail className="w-3.5 h-3.5" />
                <span>Get in Touch</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Contact the Alumni Secretariat
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Reach out to the Sabuj Shikshayatan Government High School Alumni Executive Council for registration assistance, reunion sponsorships, batch coordination, or donation queries.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Info Cards (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-slate-900">Alumni Secretariat Office</h3>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">Campus Address:</strong>
                      <span>{schoolInfo.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">Association phone:</strong>
                      <a href={`tel:${schoolInfo.associationPhone.replace(/[^+\d]/g, "")}`} className="text-emerald-700 hover:underline">{schoolInfo.associationPhone}</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">School phone:</strong>
                      <a href={`tel:${schoolInfo.phone.replace(/[^+\d]/g, "")}`} className="text-emerald-700 hover:underline">{schoolInfo.phone}</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">Alumni association email:</strong>
                      <a href={`mailto:${schoolInfo.associationEmail}`} className="text-emerald-700 hover:underline break-all">{schoolInfo.associationEmail}</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">School Web Portal:</strong>
                      <a href={schoolInfo.website} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                        {schoolInfo.website}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FacebookIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">On Facebook:</strong>
                      <a href={schoolInfo.facebookGroup} target="_blank" rel="noopener noreferrer" className="block text-emerald-700 hover:underline">
                        Alumni association group
                      </a>
                      <a href={schoolInfo.facebookPage} target="_blank" rel="noopener noreferrer" className="block text-emerald-700 hover:underline">
                        School page
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map representation card */}
              <div className="bg-[#06281e] text-white p-6 rounded-3xl border border-emerald-800 shadow-sm space-y-2">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Location &amp; Coordinates
                </span>
                <h4 className="font-bold text-sm text-white">South Sonaichhari, Sitakunda, Chattogram</h4>
                <p className="text-xs text-emerald-200">
                  Conveniently accessible along the Dhaka-Chattogram highway corridor. Visitors and alumni delegates are welcomed at the Alumni Office during regular school hours.
                </p>
              </div>
            </div>

            {/* Inquiry Form (7 cols) */}
            <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Send an Inquiry</h3>
              <p className="text-xs text-slate-500 mb-6">
                Our volunteer executive committee typically responds within 24 to 48 hours.
              </p>

              {reference !== null ? (
                <div role="status" className="p-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-base text-slate-900">Message sent</h4>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Thank you. The committee will reply to {form.email}.{reference ? ` Your reference: ${reference}.` : ""}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ct-name" className={label}>Your name *</label>
                      <input id="ct-name" type="text" required autoComplete="name" maxLength={120} value={form.name} onChange={set("name")} className={field} />
                    </div>
                    <div>
                      <label htmlFor="ct-batch" className={label}>SSC batch <span className="font-normal text-slate-400">(if you studied here)</span></label>
                      <input id="ct-batch" type="text" inputMode="numeric" maxLength={4} value={form.batch} onChange={set("batch")} className={field} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ct-email" className={label}>Email *</label>
                      <input id="ct-email" type="email" required autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} className={field} />
                    </div>
                    <div>
                      <label htmlFor="ct-phone" className={label}>Phone <span className="font-normal text-slate-400">(optional)</span></label>
                      <input id="ct-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={set("phone")} className={field} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ct-subject" className={label}>Subject</label>
                    <select id="ct-subject" value={form.subject} onChange={set("subject")} className={field}>
                      {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ct-message" className={label}>Message *</label>
                    <textarea id="ct-message" rows={5} required maxLength={5000} value={form.message} onChange={set("message")} className={`${field} resize-none`} />
                  </div>
                  {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-6 py-3 min-h-[48px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{sending ? "Sending…" : "Send message"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
