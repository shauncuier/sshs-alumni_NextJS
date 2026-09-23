"use client";

import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { schoolInfo } from "@/lib/data";
import {
  MapPin,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  Building,
  Globe
} from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
                      <strong className="block text-slate-900 font-semibold">Hotline:</strong>
                      <span>{schoolInfo.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-semibold">Official Email:</strong>
                      <span>{schoolInfo.email}</span>
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

              {submitted ? (
                <div className="p-8 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-base text-slate-900">Message Received</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Thank you for contacting the Sabuj Shikshayatan Alumni Secretariat. A designated batch coordinator or committee secretary will reach out shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Md. Rahim Ahmed"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SSC Batch Year (if Alumnus)</label>
                      <input
                        type="text"
                        placeholder="e.g. 2008"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+880 1700-000000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                    <select className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600">
                      <option>General Alumni Inquiry</option>
                      <option>Registration &amp; Verification Support</option>
                      <option>Reunion &amp; Event Sponsorship</option>
                      <option>Scholarship Fund Contribution</option>
                      <option>Batch Representative Appointment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Your Message</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Please describe how we can assist you..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message to Secretariat</span>
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
