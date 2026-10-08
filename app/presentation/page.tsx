"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Grid,
  ExternalLink,
  Printer,
  CheckCircle2,
  Layers,
  ShieldCheck,
  CreditCard,
  QrCode,
  Briefcase,
  Users,
  Compass,
  ArrowRight,
  Clock,
  Sparkles,
  Smartphone,
  Award,
  Radio,
  BookOpen,
  DollarSign,
  Send,
} from "lucide-react";

interface SlideData {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
  speakerNotes: string;
  demoUrl?: string;
  demoLabel?: string;
}

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides: SlideData[] = [
    // Slide 1
    {
      id: 1,
      tag: "Executive Overview",
      title: "Connecting Generations",
      subtitle: "The Official SSGHS Alumni Digital Platform (EIIN: 105070)",
      speakerNotes:
        "Good morning/afternoon everyone. Today, I'm proud to present the complete digital platform built for the Sabuj Shikshayatan Government High School Alumni Association. Over our development cycle, we have unified over 40 graduation batches (1985–2025) into a single, secure, and modern digital ecosystem. The application is now in Release Candidate status with 63 compiled routes and zero technical debt.",
      demoUrl: "/",
      demoLabel: "Launch Live Homepage",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                40+
              </div>
              <h4 className="font-semibold text-white text-base">Graduation Batches</h4>
              <p className="text-slate-300 text-sm mt-1">1985 to 2025 unified into one verified directory and network.</p>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg mb-3">
                63+
              </div>
              <h4 className="font-semibold text-white text-base">Verified Web Routes</h4>
              <p className="text-slate-300 text-sm mt-1">Next.js 15+ App Router, full-stack API endpoints, and real-time sync.</p>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg mb-3">
                92%+
              </div>
              <h4 className="font-semibold text-white text-base">Overall Readiness</h4>
              <p className="text-slate-300 text-sm mt-1">Core MVP, Payments, Digital Pass, and Career hubs 100% complete.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Release Candidate (RC-1)
              </span>
              <span className="text-sm text-slate-300">Sabuj Shikshayatan Govt. High School, Chattogram</span>
            </div>
            <div className="text-xs text-amber-300 font-mono">Status: Ready for Executive Showcase</div>
          </div>
        </div>
      ),
    },

    // Slide 2
    {
      id: 2,
      tag: "The Mission",
      title: "The Problems We Solved",
      subtitle: "Transforming Fragmented Communities into an Empowered Digital Association",
      speakerNotes:
        "Our goal was not just to build a static website. We built an active community platform. In the past, alumni records were scattered across private WhatsApp groups and Facebook pages with zero institutional memory. Event ticketing and fundraising required manual bKash screenshots and spreadsheet tracking. Today, we've replaced all of that with a modern, transparent system that also supports mentorship and career growth.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-3">
            <h4 className="font-semibold text-rose-300 flex items-center gap-2 text-base">
              <span className="text-lg">❌</span> Old Fragmented Challenges
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Alumni records scattered across disconnected Facebook groups with no verified database.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Manual cash collection and spreadsheet reconciliation for reunions and gifts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Paper ticket forgery and overcrowding at school gate check-ins during celebrations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>Zero formal bridge for young graduates to connect with senior alumni for jobs and civil service guidance.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
            <h4 className="font-semibold text-emerald-300 flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> New SSGHS Platform Solution
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Single Source of Truth:</strong> Centralized directory covering 1985–2025 with privacy toggles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Local Digital Payments:</strong> Instant bKash, Nagad, and Card checkout with digital audit receipts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Smart ID Cards:</strong> 3D digital pass with HMAC-SHA256 encrypted QR for 1-second gate verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Career & Mentorship:</strong> Alumni job board + 1-on-1 BCS/Corporate mentorship matching engine.</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 3
    {
      id: 3,
      tag: "Technology Stack",
      title: "Enterprise Full-Stack Architecture",
      subtitle: "Engineered for High Performance, Security, and Mobile Responsiveness",
      speakerNotes:
        "From an engineering perspective, this application is built with the latest enterprise web standards. We are using Next.js 15+ App Router and React 19 for blazingly fast client-side navigation. Our database runs on MySQL/MariaDB with Prisma ORM, supporting 13 interconnected relational models. We also engineered a zero-dependency real-time sync engine using Server-Sent Events, meaning instant chat and notifications with no costly monthly socket bills.",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-mono text-xs uppercase mb-1">Frontend Core</div>
            <div className="font-bold text-white text-base">Next.js 15+ & React 19</div>
            <p className="text-xs text-slate-400 mt-1">App router, Server Components, and Turbopack compiler.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-mono text-xs uppercase mb-1">Styling & UI</div>
            <div className="font-bold text-white text-base">Tailwind CSS v4</div>
            <p className="text-xs text-slate-400 mt-1">Academic Forest Green, Emerald, & Gold brand design tokens.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-mono text-xs uppercase mb-1">Database & ORM</div>
            <div className="font-bold text-white text-base">MySQL + Prisma v7</div>
            <p className="text-xs text-slate-400 mt-1">13 relational models: Users, Batches, Posts, Payments, Passes.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-mono text-xs uppercase mb-1">Real-Time Engine</div>
            <div className="font-bold text-white text-base">Server-Sent Events</div>
            <p className="text-xs text-slate-400 mt-1">Instant chat, live alerts, and 30s heartbeat with zero third-party deps.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-amber-400 font-mono text-xs uppercase mb-1">Authentication</div>
            <div className="font-bold text-white text-base">NextAuth.js RBAC</div>
            <p className="text-xs text-slate-400 mt-1">Super Admin, Admin, Moderator, and Alumni role guards.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-amber-400 font-mono text-xs uppercase mb-1">Payment Hub</div>
            <div className="font-bold text-white text-base">bKash + Nagad + SSL</div>
            <p className="text-xs text-slate-400 mt-1">Unified payment router for donations, passes, and dues.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-amber-400 font-mono text-xs uppercase mb-1">Mobile Native</div>
            <div className="font-bold text-white text-base">PWA & Offline Cache</div>
            <p className="text-xs text-slate-400 mt-1">Service Worker caches directory lists for offline campus use.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-amber-400 font-mono text-xs uppercase mb-1">Digital Security</div>
            <div className="font-bold text-white text-base">HMAC-SHA256</div>
            <p className="text-xs text-slate-400 mt-1">Tamper-proof digital tokens for 3D Alumni ID and gate scanner.</p>
          </div>
        </div>
      ),
    },

    // Slide 4
    {
      id: 4,
      tag: "Phase 1: 100% Completed",
      title: "Public Portal & Alumni Social Suite",
      subtitle: "Nostalgia Meets Professional Networking for 40+ Batches",
      speakerNotes:
        "In Phase 1, we established the full public portal and private alumni community suite. The homepage features live statistics, urgent donation campaigns, and upcoming reunions. Our directory supports instant multi-filtering by batch, profession, and blood group. Inside the authenticated portal, members have a LinkedIn-style profile, an interactive feed where they can post memories and photos, and direct 1-on-1 private messaging.",
      demoUrl: "/alumni",
      demoLabel: "Explore Alumni Directory",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3 bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl">
            <h4 className="font-semibold text-emerald-300 text-base flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" /> Public Portal Features
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><strong>Dynamic Homepage:</strong> Hero banner, quick stats, upcoming reunions, and alumni spotlight.</li>
              <li><strong>School History & Legacy:</strong> EIIN 105070 documentation, headmaster tribute, campus timeline.</li>
              <li><strong>Alumni Directory:</strong> Instant search by graduation batch (1985–2025), profession, blood group, city.</li>
              <li><strong>Batch Hubs (`/batches/[year]`):</strong> Dedicated batch pages with batch leaders and classmate rosters.</li>
              <li><strong>Stories & Gallery:</strong> Alumni memoirs, notable alumni hall of fame, and interactive photo lightbox.</li>
            </ul>
          </div>

          <div className="space-y-3 bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl">
            <h4 className="font-semibold text-emerald-300 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Authenticated Alumni Suite
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><strong>Member Dashboard:</strong> Quick metrics, upcoming RSVPs, batch announcements, classmate suggestions.</li>
              <li><strong>LinkedIn-Style Profile:</strong> Experience, education, skills tags, social links, contact privacy toggles.</li>
              <li><strong>Community Social Feed:</strong> Post creation with image attachment, instant like toggles, threaded comments.</li>
              <li><strong>Direct Messaging:</strong> Conversation sidebar, interactive chat box, timestamped message exchanges.</li>
              <li><strong>Classmate Network:</strong> Batchmate discovery and connection invites.</li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 5
    {
      id: 5,
      tag: "Phase 2: 100% Completed",
      title: "Bangladeshi Payment Gateways & Real-Time Sync",
      subtitle: "Instant Mobile Checkout with bKash, Nagad, Cards, and Live SSE Updates",
      speakerNotes:
        "In Phase 2, we solved one of the largest operational bottlenecks: payments. We engineered native integration with bKash Tokenized Checkout, Nagad Merchant API, and SSLCommerz for credit/debit cards and mobile banking. When someone donates to the STEM Lab or buys a reunion pass, they receive an immediate digital receipt and the donation meter updates live. We also rolled out Server-Sent Events for instant chat delivery without refreshing.",
      demoUrl: "/donate",
      demoLabel: "View Donation Campaigns",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-pink-950/30 border border-pink-500/30 p-4 rounded-xl">
              <div className="text-pink-400 font-bold text-base mb-1">bKash Tokenized Checkout</div>
              <p className="text-xs text-slate-300">One-click checkout, token caching, create/execute/query lifecycle with audit trail.</p>
            </div>
            <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl">
              <div className="text-amber-400 font-bold text-base mb-1">Nagad Merchant API</div>
              <p className="text-xs text-slate-300">RSA public/private key encryption, PG challenge protocol, instant callback validation.</p>
            </div>
            <div className="bg-blue-950/30 border border-blue-500/30 p-4 rounded-xl">
              <div className="text-blue-400 font-bold text-base mb-1">SSLCommerz Aggregator</div>
              <p className="text-xs text-slate-300">Visa, Mastercard, Rocket, Upay, and Internet Banking with IPN webhook security.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
              <h5 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" /> Real-Time SSE Architecture
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                Server-Sent Events deliver instant direct messages, unread badge counters, and broadcast announcements with zero polling delay and automated 30s heartbeat.
              </p>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
              <h5 className="font-semibold text-white text-sm mb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Transactional Email Service
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                Branded HTML email templates for Alumni Verification Approval, Donation Receipt Confirmation, and Event RSVP Pass confirmations via Resend/SMTP.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6
    {
      id: 6,
      tag: "Phase 3: 100% Completed",
      title: "Digital Smart Alumni ID Card & Gate Scanner",
      subtitle: "Tamper-Proof HMAC-SHA256 Passes with Optical Scanner for 1-Second Check-In",
      speakerNotes:
        "One of the standout achievements is our Digital Smart ID Card. Each verified alumnus gets an interactive 3D flippable card on their phone with their photo, batch year, blood group, and lifetime membership status. The card features an encrypted QR code signed with HMAC-SHA256 to prevent pass forgery. At reunions, gate security volunteers open our built-in camera gate scanner at /gate to authenticate delegates in one second.",
      demoUrl: "/card",
      demoLabel: "Launch 3D Digital Card",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-emerald-500/40 p-5 rounded-xl space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">3D Flippable Smart ID Card</h4>
            <p className="text-xs text-slate-300">
              Interactive card displaying school crest, batch typography, lifetime membership, and blood group with print and share options.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-amber-500/40 p-5 rounded-xl space-y-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">Cryptographic QR Verification</h4>
            <p className="text-xs text-slate-300">
              Tokens signed with HMAC-SHA256 signature to guarantee credential authenticity and eliminate counterfeit event passes.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-blue-500/40 p-5 rounded-xl space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">Volunteer Gate Scanner (`/gate`)</h4>
            <p className="text-xs text-slate-300">
              Camera optical viewfinder scanner for gate security with instant alumnus lookup and live verified attendance logs.
            </p>
          </div>
        </div>
      ),
    },

    // Slide 7
    {
      id: 7,
      tag: "Phase 4: 100% Completed",
      title: "Careers, Mentorship & Reunion Ticketing",
      subtitle: "Empowering Professional Growth and Seamless Event Logistics",
      speakerNotes:
        "Phase 4 makes the platform valuable every single day of the year. We launched an Alumni Job Portal where graduates can post vacancies and apply. We built a 1-on-1 Mentorship Matching Engine connecting senior alumni in BCS administration, clinical medicine, and technology with young graduates, automatically generating Google Meet session links. Finally, our Reunion Ticketing system handles tiered passes, T-shirt sizing, and traditional Mezban meal preferences.",
      demoUrl: "/events/1/ticket",
      demoLabel: "Demo Reunion Ticketing Flow",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Alumni Job Board (`/careers`)</h4>
            <p className="text-xs text-slate-300">
              Alumni employers post vacancies and internships. Applicants filter by sector (Engineering, Medicine, BCS, QA) and submit resumes.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">1-on-1 Mentorship (`/mentorship`)</h4>
            <p className="text-xs text-slate-300">
              Senior mentors across BCS Cadre, Medicine, and Tech guide young graduates. Automated scheduling with Google Meet links.
            </p>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white text-base">Reunion Ticketing & Hospitality</h4>
            <p className="text-xs text-slate-300">
              Tiered delegate passes (৳1,500 to ৳5,000), T-shirt size picker (S–XXL), and meal options (Traditional Mezban, Diabetic, Veg).
            </p>
          </div>
        </div>
      ),
    },

    // Slide 8
    {
      id: 8,
      tag: "Governance & Security",
      title: "Admin Control Center & Association Governance",
      subtitle: "Complete Operational Visibility for Executive Committee Members",
      speakerNotes:
        "For the executive committee and administrators, governance is simple and transparent. The admin panel at /admin provides a high-level analytics dashboard showing total alumni, pending verifications, and funds raised. To prevent fake registrations, admins have a one-click Verification Queue to review and verify student records. Admins can also manage batches, assign batch coordinators, and inspect transparent donation audit logs.",
      demoUrl: "/admin",
      demoLabel: "Open Admin Control Center",
      content: (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-bold text-base mb-1">Executive KPIs</div>
            <p className="text-xs text-slate-300">Real-time counts of active members, verification pipeline, and funds collected.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-bold text-base mb-1">Verification Queue</div>
            <p className="text-xs text-slate-300">One-click Approve/Reject workflow with automated approval emails.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-bold text-base mb-1">Batch Coordination</div>
            <p className="text-xs text-slate-300">Assign elected batch coordinators and publish batch milestone news.</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-700/60 p-4 rounded-xl">
            <div className="text-emerald-400 font-bold text-base mb-1">Financial Ledger</div>
            <p className="text-xs text-slate-300">Complete audit trail of all payments with transaction IDs and gateway references.</p>
          </div>
        </div>
      ),
    },

    // Slide 9
    {
      id: 9,
      tag: "Progress Scorecard",
      title: "How Much is Done? (Scorecard)",
      subtitle: "Phase-by-Phase Completion Status and Production Readiness",
      speakerNotes:
        "Here is our progress scorecard. All four major phases — the core platform, payments, digital ID cards, and career hubs — are 100% complete and verified. The overall platform stands at over 92% readiness. The only unbuilt items belong to Phase 5 future expansions, such as the historical photo archive from 1975 and the retired teachers emergency medical fund.",
      content: (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase font-mono text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Module / Phase</th>
                <th className="py-2.5 px-3">Target Scope</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Readiness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Phase 1: Public & Member Portal</td>
                <td className="py-2 px-3">Directory, Batches (1985–2025), Feed, Profiles, Messages</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-400">100%</td>
                <td className="py-2 px-3 text-right text-emerald-400">🟢 Production Ready</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Phase 2: Bangladeshi Payments</td>
                <td className="py-2 px-3">bKash, Nagad, SSLCommerz, Real-time SSE, Email receipts</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-400">100%</td>
                <td className="py-2 px-3 text-right text-emerald-400">🟢 Tested & Active</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Phase 3: Digital Smart ID Card</td>
                <td className="py-2 px-3">3D Card, HMAC QR signature, Camera Gate Scanner, PWA</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-400">100%</td>
                <td className="py-2 px-3 text-right text-emerald-400">🟢 Production Ready</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-emerald-300">Phase 4: Careers & Reunion Ticketing</td>
                <td className="py-2 px-3">Job board, Mentorship Meet links, Tiered passes, T-shirts</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-400">100%</td>
                <td className="py-2 px-3 text-right text-emerald-400">🟢 Production Ready</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold text-amber-300">Phase 5: Golden Jubilee Archives</td>
                <td className="py-2 px-3">Historical 1975 archive, Retired teachers fund, Audit reports</td>
                <td className="py-2 px-3 text-center font-bold text-amber-400">Roadmap</td>
                <td className="py-2 px-3 text-right text-amber-400">🟡 Post-Launch Phase</td>
              </tr>
              <tr className="bg-emerald-950/40 font-bold">
                <td className="py-2.5 px-3 text-white">Platform Overall Total</td>
                <td className="py-2.5 px-3 text-emerald-200">63 App Routes, 13 Relational Models</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 text-sm">~92% - 95%</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">🟢 Ready to Showcase</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },

    // Slide 10
    {
      id: 10,
      tag: "Meeting Live Demo",
      title: "Interactive Demonstration Walkthrough",
      subtitle: "5-Minute Guided Screen-Share Route to Showcase the Platform Live",
      speakerNotes:
        "Now, I would like to transition to our live demonstration. I will take you through 5 key touchpoints: first, our responsive homepage and Ctrl+K search modal; second, filtering the 40-year batch directory; third, flipping the 3D smart ID card; fourth, booking a reunion pass with T-shirt size and Mezban selection; and finally, scanning passes with the gate scanner and reviewing administrative KPIs.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                1
              </div>
              <h5 className="font-semibold text-white text-sm">Home & Search</h5>
              <p className="text-xs text-slate-400 mt-1">Press Ctrl+K to search batches and alumni instantly.</p>
            </div>
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
              Launch <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <a
            href="/alumni"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                2
              </div>
              <h5 className="font-semibold text-white text-sm">Directory Hub</h5>
              <p className="text-xs text-slate-400 mt-1">Filter by batch 1985–2025, profession, and blood group.</p>
            </div>
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
              Launch <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <a
            href="/card"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                3
              </div>
              <h5 className="font-semibold text-white text-sm">3D Smart ID Card</h5>
              <p className="text-xs text-slate-400 mt-1">Flip card in 3D and showcase HMAC encrypted QR pass.</p>
            </div>
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
              Launch <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <a
            href="/events/1/ticket"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                4
              </div>
              <h5 className="font-semibold text-white text-sm">Reunion Tickets</h5>
              <p className="text-xs text-slate-400 mt-1">Tiered delegate pass, T-shirt size, and Mezban food picker.</p>
            </div>
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
              Launch <ExternalLink className="w-3 h-3" />
            </div>
          </a>

          <a
            href="/gate"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-emerald-500/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                5
              </div>
              <h5 className="font-semibold text-white text-sm">Gate Scanner</h5>
              <p className="text-xs text-slate-400 mt-1">Optical camera QR scanner for 1-second gate verification.</p>
            </div>
            <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1 group-hover:underline">
              Launch <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        </div>
      ),
    },

    // Slide 11
    {
      id: 11,
      tag: "What's Left",
      title: "Launch Checklist & Future Enhancements",
      subtitle: "Remaining Operational Steps to Transition from Pilot to Public Launch",
      speakerNotes:
        "What is left before we publicly open to all alumni? On the technical side, the platform code is ready. The remaining steps are operational: first, obtaining live production merchant credentials from bKash and Nagad; second, connecting the Bangladesh SMS OTP gateway; third, provisioning the official live domain; and fourth, nominating two batch ambassadors per graduation year to review classmate lists.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-900/70 border border-amber-500/40 p-5 rounded-xl space-y-3">
            <h4 className="font-semibold text-amber-300 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Immediate Launch Readiness Checklist
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span><strong>Production Payment Keys:</strong> Swap sandbox test credentials with official merchant accounts (bKash & Nagad contracts).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span><strong>Live SMS OTP Gateway:</strong> Connect Greenweb/Reve SMS API for mobile phone verification during sign-up.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">3.</span>
                <span><strong>Domain & SSL Hosting:</strong> Deploy to production server (Vercel Pro or VPS Nginx/PM2) bound to official domain.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">4.</span>
                <span><strong>Batch Ambassador Seeding:</strong> Onboard 2 representatives per batch (1985–2025) to verify historical records.</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 p-5 rounded-xl space-y-3">
            <h4 className="font-semibold text-slate-200 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Phase 5 Roadmap (Post-Launch)
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Historical Photo Archive:</strong> High-resolution batch galleries (1975–2025) with deep zoom and tagging.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Retired Teachers Tribute & Medical Fund:</strong> Dedicated fund for emergency healthcare support of veteran teachers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Public Audited Financial Balance Sheet:</strong> Transparent annual balance sheet viewer for alumni trust fund auditing.</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 12
    {
      id: 12,
      tag: "Action Plan",
      title: "Next Steps & Committee Discussion",
      subtitle: "Collaborating on Timeline, Launch Dates, and Association Priorities",
      speakerNotes:
        "Thank you for your attention. At this stage, we recommend a 4-week timeline: Week 1 for committee sign-off, Week 2 for merchant account KYC completion, Week 3 for batch representative onboarding, and Week 4 for full public launch and ticket sales for the Golden Jubilee. We now welcome questions, feedback, and discussion from the executive committee.",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl">
              <div className="text-xs font-mono text-emerald-400 uppercase">Week 1</div>
              <h5 className="font-bold text-white text-sm mt-1">Committee Sign-off</h5>
              <p className="text-xs text-slate-300 mt-1">Review feedback, finalize registration fees, approve design.</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl">
              <div className="text-xs font-mono text-emerald-400 uppercase">Week 2</div>
              <h5 className="font-bold text-white text-sm mt-1">Merchant KYC</h5>
              <p className="text-xs text-slate-300 mt-1">Submit association bank documents to bKash and Nagad.</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl">
              <div className="text-xs font-mono text-emerald-400 uppercase">Week 3</div>
              <h5 className="font-bold text-white text-sm mt-1">Batch Pilot</h5>
              <p className="text-xs text-slate-300 mt-1">Batch leaders log in, test smart cards, and seed member lists.</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl">
              <div className="text-xs font-mono text-emerald-400 uppercase">Week 4</div>
              <h5 className="font-bold text-white text-sm mt-1">Public Launch</h5>
              <p className="text-xs text-slate-300 mt-1">Open public registration and Golden Jubilee ticket sales.</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/60 p-5 rounded-xl text-center space-y-3">
            <h4 className="font-bold text-white text-lg">Open Floor for Discussion & Feedback</h4>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Any specific donation campaigns to prioritize? Confirmation on reunion delegate ticket tiers (৳1,500 / ৳2,800 / ৳5,000)?
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-900/40"
              >
                Return to Live Platform
              </Link>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "n" || e.key === "N") {
        setShowNotes((prev) => !prev);
      } else if (e.key === "g" || e.key === "G") {
        setShowGrid((prev) => !prev);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        setShowGrid(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header & Navigation Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-emerald-400 font-bold text-sm hover:text-emerald-300 transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xs font-serif font-black">
              SS
            </div>
            <span>SSGHS Alumni</span>
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">
            Executive Showcase Deck
          </span>
        </div>

        {/* Slide Tracker Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Slide {currentSlide + 1} of {slides.length}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes((prev) => !prev)}
            title="Toggle Presenter Notes (N)"
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              showNotes
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Notes</span>
          </button>

          <button
            onClick={() => window.print()}
            title="Print / Save PDF (Ctrl+P)"
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (F)"
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
        />
      </div>

      {/* Main Slide Stage */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 max-w-6xl w-full mx-auto relative overflow-y-auto">
        {/* Slide Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {current.tag}
            </span>
            <span className="text-xs text-slate-500">Sabuj Shikshayatan Govt. High School</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {current.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        {/* Slide Body Content */}
        <div className="my-auto py-6">
          {current.content}
        </div>

        {/* Slide Footer with Optional Demo Trigger */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200">Space</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200">→</kbd> to advance</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200">N</kbd> Notes</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200">G</kbd> Grid</span>
          </div>

          {current.demoUrl && (
            <a
              href={current.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{current.demoLabel || "Launch Live Demo"}</span>
            </a>
          )}
        </div>
      </main>

      {/* Persistent Bottom Bar with Arrows */}
      <footer className="h-16 border-t border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between z-20 backdrop-blur-md">
        <button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            currentSlide === 0
              ? "opacity-30 cursor-not-allowed text-slate-500"
              : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Quick Slide Dots */}
        <div className="hidden sm:flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentSlide
                  ? "w-6 bg-emerald-400"
                  : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
              title={`Jump to slide ${idx + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            currentSlide === slides.length - 1
              ? "opacity-30 cursor-not-allowed text-slate-500"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Presenter Notes Teleprompter Overlay */}
      {showNotes && (
        <aside className="fixed bottom-18 right-6 w-96 max-w-[90vw] bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl p-5 z-40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                Presenter Speaking Script
              </span>
            </div>
            <button
              onClick={() => setShowNotes(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed max-h-56 overflow-y-auto pr-1">
            "{current.speakerNotes}"
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
            <span>Slide {currentSlide + 1} Talking Points</span>
            <span>Press 'N' to dismiss</span>
          </div>
        </aside>
      )}

      {/* Grid Thumbnail Modal (Slide Picker) */}
      {showGrid && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Grid className="w-4 h-4 text-emerald-400" /> Slide Overview Navigator
              </h3>
              <button
                onClick={() => setShowGrid(false)}
                className="text-sm text-slate-400 hover:text-white"
              >
                Close (Esc)
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentSlide(idx);
                    setShowGrid(false);
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-32 transition-all ${
                    idx === currentSlide
                      ? "border-emerald-500 bg-emerald-950/50 ring-2 ring-emerald-500/40"
                      : "border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                      SLIDE {idx + 1}
                    </span>
                    <h5 className="font-bold text-white text-xs mt-1 line-clamp-2">
                      {s.title}
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">{s.tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
