import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { schoolInfo } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-[#041a13] text-slate-300 border-t border-emerald-900/80">
      {/* Top Banner: Nostalgic Motto */}
      <div className="bg-[#06281e] border-b border-emerald-800/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Once an SSGHS Student, Always a Family.
            </h3>
            <p className="text-sm text-emerald-300/90">
              Find your batchmates, join our events and help the school that taught us.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 transition-transform hover:-translate-y-0.5"
            >
              Register as Alumni
            </Link>
            <Link
              href="/alumni"
              className="px-5 py-2.5 rounded-xl bg-emerald-900/90 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-semibold text-sm transition-colors"
            >
              Explore Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: School Identity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full p-0.5 shadow-md flex items-center justify-center ring-2 ring-amber-400/40 bg-white overflow-hidden shrink-0">
                <NextImage
                  src="/logo.png"
                  alt="SSGHS Alumni Association Crest"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white block leading-tight">
                  SSGHS Alumni Association
                </span>
                <span className="text-xs text-emerald-400 block font-medium">
                  সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয় প্রাক্তন ছাত্র-ছাত্রী পরিষদ
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pr-4">
              The official digital ecosystem for the SSGHS Alumni Association (Sabuj Shikshayatan Government High School). Connecting classmates, preserving historic school archives, organizing reunions, and empowering the next generation of secondary students.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{schoolInfo.location}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <a href={`tel:${schoolInfo.phone.replace(/[^+\d]/g, "")}`} className="hover:text-emerald-300">{schoolInfo.phone}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                <a href={`mailto:${schoolInfo.associationEmail}`} className="hover:text-emerald-300 break-all">{schoolInfo.associationEmail}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                <a
                  href={schoolInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Official School Website <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>

          {/* Column 2: Alumni Navigation */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              Alumni Network
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/alumni" className="hover:text-emerald-300 transition-colors">
                  Alumni Directory
                </Link>
              </li>
              <li>
                <Link href="/batches" className="hover:text-emerald-300 transition-colors">
                  Batch Explorer (1985-2025)
                </Link>
              </li>
              <li>
                <Link href="/stories" className="hover:text-emerald-300 transition-colors">
                  Alumni Stories &amp; Spotlights
                </Link>
              </li>
              <li>
                <Link href="/achievements" className="hover:text-emerald-300 transition-colors">
                  Distinguished Hall of Fame
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-emerald-300 transition-colors">
                  Photo Gallery &amp; Nostalgia
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                  Verification &amp; Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Association & School */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              Institution
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-emerald-300 transition-colors">
                  About Association
                </Link>
              </li>
              <li>
                <Link href="/school" className="hover:text-emerald-300 transition-colors">
                  School Heritage &amp; Campus
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-emerald-300 transition-colors">
                  News &amp; Announcements
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-emerald-300 transition-colors">
                  Reunions &amp; Sports Tournaments
                </Link>
              </li>
              <li>
                <Link href="/donate" className="hover:text-emerald-300 transition-colors">
                  Scholarship &amp; Giving Back
                </Link>
              </li>
              <li>
                <Link href="/volunteer" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
                  Volunteer Squad (স্বেচ্ছাসেবী)
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-300 transition-colors">
                  Contact Committee
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Portals & Security */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">
              Community Access
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/dashboard" className="text-emerald-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors">
                  <span>Alumni Dashboard</span>
                </Link>
              </li>
              <li>
                <Link href="/feed" className="hover:text-emerald-300 transition-colors">
                  Community Social Feed
                </Link>
              </li>
              <li>
                <Link href="/messages" className="hover:text-emerald-300 transition-colors">
                  Direct Messages
                </Link>
              </li>
              <li>
                <Link href="/network" className="hover:text-emerald-300 transition-colors">
                  Find Batchmates
                </Link>
              </li>
            </ul>

            <div className="mt-6 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-300">
              <span className="font-semibold text-white block mb-0.5">EIIN: {schoolInfo.eiin}</span>
              {schoolInfo.board}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Tagline */}
      <div className="bg-[#020e0a] border-t border-emerald-950 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 sm:gap-8">
            <p>
              © {new Date().getFullYear()} SSGHS Alumni Association (Sabuj Shikshayatan Government High School). All rights reserved.
            </p>
            <p className="text-slate-400">
              Designed &amp; developed by <a href="https://3s-soft.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">3s-Soft</a>
            </p>
          </div>
          <p className="text-emerald-400/80 font-medium">
            &ldquo;Connecting generations, preserving memories, building the future.&rdquo;
          </p>
        </div>
      </div>
    </footer>
  );
}
