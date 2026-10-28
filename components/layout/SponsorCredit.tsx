"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";

interface Credit {
  name: string;
  nameEn: string | null;
  address: string | null;
  logoUrl: string | null;
}

/**
 * The website infrastructure sponsor's credit in the footer (Admin → Sponsors). The
 * footer also renders inside client pages, so the sponsor is read from the API.
 */
export default function SponsorCredit() {
  const [sponsor, setSponsor] = useState<Credit | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/sponsors/featured")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live && data?.sponsor) setSponsor(data.sponsor);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!sponsor) return null;
  return (
    <div className="border-t border-emerald-900/80 py-5 px-4 sm:px-6 lg:px-8">
      <Link prefetch={false} href="/sponsors" className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left group">
        {sponsor.logoUrl && (
          <NextImage
            src={sponsor.logoUrl}
            alt={`${sponsor.nameEn ?? sponsor.name} logo`}
            width={56}
            height={56}
            className="w-14 h-14 shrink-0 rounded-full object-contain bg-white ring-2 ring-emerald-800/60"
          />
        )}
        <div className="space-y-0.5">
          <p className="text-sm text-slate-200">
            <span className="text-emerald-400">সৌজন্যে -</span>{" "}
            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">{sponsor.name}</span>
            {sponsor.address && <span className="text-slate-400">। {sponsor.address}</span>}
          </p>
          <p className="text-[11px] text-slate-400">
            Website infrastructure sponsor{sponsor.nameEn ? `: ${sponsor.nameEn}` : ""}
          </p>
        </div>
      </Link>
    </div>
  );
}
