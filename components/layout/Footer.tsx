import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { MapPin, Phone, Mail, Globe, ExternalLink } from "lucide-react";
import { schoolInfo } from "@/lib/data";
import FacebookIcon from "@/components/shared/FacebookIcon";
import SponsorCredit from "@/components/layout/SponsorCredit";

// Site-wide links do not prefetch: on mobile data, prefetching every menu and footer link
// on every page costs more than the faster click is worth.
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
            <Link prefetch={false}
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 transition-transform hover:-translate-y-0.5"
            >
              Register as Alumni
            </Link>
            <Link prefetch={false}
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
                  alt="Praktan Sabujian Parishad Crest"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white block leading-tight">
                  প্রাক্তন সবুজিয়ান পরিষদ
                </span>
                <span className="text-xs text-emerald-400 block font-medium">
                  Praktan Sabujian Parishad
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pr-4">
              The official digital ecosystem for Praktan Sabujian Parishad (Sabuj Shikshayatan Government High School). Connecting classmates, preserving historic school archives, organizing reunions, and empowering the next generation of secondary students.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{schoolInfo.location}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                <a href={`tel:${schoolInfo.associationPhone.replace(/[^+\d]/g, "")}`} className="hover:text-emerald-300">{schoolInfo.associationPhone}</a>
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
              <div className="flex items-center gap-2.5">
                <FacebookIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <a href={schoolInfo.facebookGroup} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    Alumni Facebook group
                  </a>
                  <a href={schoolInfo.facebookPage} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    School Facebook page
                  </a>
                </span>
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
                <Link prefetch={false} href="/alumni" className="hover:text-emerald-300 transition-colors">
                  Alumni Directory
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/batches" className="hover:text-emerald-300 transition-colors">
                  Batch Explorer (1985-2025)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/stories" className="hover:text-emerald-300 transition-colors">
                  Alumni Stories &amp; Spotlights
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/achievements" className="hover:text-emerald-300 transition-colors">
                  Distinguished Hall of Fame
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/gallery" className="hover:text-emerald-300 transition-colors">
                  Photo Gallery &amp; Nostalgia
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
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
                <Link prefetch={false} href="/about" className="hover:text-emerald-300 transition-colors">
                  About Association
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/committee" className="hover:text-emerald-300 transition-colors">
                  Executive Committee
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/constitution" className="hover:text-emerald-300 transition-colors">
                  Constitution
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/honor-board" className="hover:text-emerald-300 transition-colors">
                  Honor Board
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/school" className="hover:text-emerald-300 transition-colors">
                  School Heritage &amp; Campus
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/notices" className="hover:text-emerald-300 transition-colors">
                  Notice Board
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/news" className="hover:text-emerald-300 transition-colors">
                  News &amp; Announcements
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/events" className="hover:text-emerald-300 transition-colors">
                  Reunions &amp; Sports Tournaments
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/donate" className="hover:text-emerald-300 transition-colors">
                  Scholarship &amp; Giving Back
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/volunteer" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
                  Volunteer Squad (স্বেচ্ছাসেবী)
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/sponsors" className="hover:text-emerald-300 transition-colors">
                  Our Sponsors
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/contact" className="hover:text-emerald-300 transition-colors">
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
                <Link prefetch={false} href="/dashboard" className="text-emerald-300 hover:text-white font-medium flex items-center gap-1.5 transition-colors">
                  <span>Alumni Dashboard</span>
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/feed" className="hover:text-emerald-300 transition-colors">
                  Community Social Feed
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/messages" className="hover:text-emerald-300 transition-colors">
                  Direct Messages
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/network" className="hover:text-emerald-300 transition-colors">
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

      {/* Sponsor credit: the website infrastructure sponsor (Admin → Sponsors) */}
      <SponsorCredit />

      {/* Bottom Bar: Copyright & credit */}
      <div className="bg-[#020e0a] border-t border-emerald-950 py-6 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-8 text-center md:text-left">
          <p>
            © {new Date().getFullYear()} Praktan Sabujian Parishad (Sabuj Shikshayatan Government High School). All rights reserved.
          </p>
          <p className="text-slate-400 shrink-0">
            Designed &amp; developed by <a href="https://3s-soft.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">3s-Soft</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
