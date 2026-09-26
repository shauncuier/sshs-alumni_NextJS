"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  Sparkles,
  QrCode,
  RotateCw,
  Download,
  Share2,
  CheckCircle2,
  School,
  ExternalLink
} from "lucide-react";

export interface CardData {
  alumniId: string;
  fullName: string;
  sscBatch: number | string;
  profession?: string;
  bloodGroup?: string;
  membershipTier?: string;
  avatarUrl?: string;
  status?: string;
  eiin?: string;
  issuedAt?: string | number;
  expiresAt?: string | number;
}

interface DigitalAlumniCardProps {
  card: CardData;
  qrDataUrl?: string;
  signedToken?: string;
  verifyUrl?: string;
}

export default function DigitalAlumniCard({
  card,
  qrDataUrl,
  signedToken,
  verifyUrl,
}: DigitalAlumniCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined" && verifyUrl) {
      navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* 3D Card Container */}
      <div className="w-full max-w-[420px] aspect-[1.586/1] perspective-1000 select-none">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d cursor-pointer rounded-3xl shadow-2xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ════════════════════ FRONT FACE ════════════════════ */}
          <div
            className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-gradient-to-br from-[#064e3b] via-[#043d2e] to-[#022319] text-white flex flex-col justify-between overflow-hidden border border-emerald-500/30 shadow-2xl backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Holographic foil overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/10 via-transparent to-emerald-300/10 pointer-events-none" />
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* School Watermark in Background */}
            <div className="absolute right-4 bottom-2 text-white/[0.04] font-black text-7xl tracking-tighter select-none pointer-events-none">
              SSGHS
            </div>

            {/* Header: School Emblem & Credentials */}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 p-1 flex items-center justify-center shadow-inner">
                  <School className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                    Sabuj Shikshayatan
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-200">
                    <span>Govt. High School, Chattogram</span>
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    <span className="font-mono text-amber-300 font-bold">EIIN {card.eiin || "105070"}</span>
                  </div>
                </div>
              </div>

              {/* Membership Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-300 shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{card.membershipTier || "LIFETIME"}</span>
              </div>
            </div>

            {/* Middle: Alumnus Details */}
            <div className="relative z-10 flex items-center gap-4 my-auto pt-2">
              <div className="relative shrink-0">
                <img
                  src={card.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                  alt={card.fullName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md ring-4 ring-emerald-900/50"
                />
                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white border-2 border-[#064e3b]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Official Alumni Identity
                </div>
                <h2 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                  {card.fullName}
                </h2>
                <div className="text-xs text-emerald-100/90 font-medium truncate">
                  {card.profession || "Distinguished Alumnus"}
                </div>
                <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800/80 border border-emerald-600/50 font-bold text-amber-300">
                    Batch &apos;{String(card.sscBatch).slice(-2)} ({card.sscBatch})
                  </span>
                  {card.bloodGroup && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-700/40 font-mono text-emerald-200">
                      Blood: {card.bloodGroup}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: ID & Security Holographic Strip */}
            <div className="relative z-10 flex items-end justify-between pt-2 border-t border-emerald-700/40">
              <div>
                <span className="block text-[9px] uppercase tracking-widest text-emerald-300/70 font-semibold">
                  Alumni Card ID
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-amber-300">
                  {card.alumniId}
                </span>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div className="text-[9px] text-emerald-300/80 leading-tight">
                  <span className="block font-semibold">Tap to flip</span>
                  <span>View Gate QR</span>
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <RotateCw className="w-3.5 h-3.5 text-emerald-200" />
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════════ BACK FACE ════════════════════ */}
          <div
            className="absolute inset-0 w-full h-full rounded-3xl p-6 bg-gradient-to-bl from-[#022319] via-[#043d2e] to-[#064e3b] text-white flex flex-col justify-between overflow-hidden border border-emerald-500/30 shadow-2xl backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Magnetic Stripe representation */}
            <div className="absolute top-0 left-0 right-0 h-9 bg-slate-950 border-b border-emerald-900/60" />

            <div className="relative z-10 pt-7 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                  Reunion &amp; Gate Verification
                </span>
                <p className="text-[10px] text-emerald-200">
                  Scan at school main gate or registration desk
                </p>
              </div>

              <div className="px-2 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-200">
                ACTIVE PASS
              </div>
            </div>

            {/* Center: QR Code with Frame */}
            <div className="relative z-10 flex items-center justify-center gap-6 my-auto">
              <div className="p-2.5 bg-white rounded-2xl shadow-xl border-2 border-amber-400">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Gate QR Code"
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-100 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 text-emerald-800" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-left text-xs max-w-[160px]">
                <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                  Gate Security
                </div>
                <p className="text-[11px] text-emerald-100 leading-snug">
                  Encrypted token verified with alumni database key.
                </p>
                <div className="text-[10px] text-emerald-300/80 font-mono">
                  HMAC-SHA256 Signed
                </div>
              </div>
            </div>

            {/* Back Footer: Signatures & Notice */}
            <div className="relative z-10 flex items-end justify-between pt-2 border-t border-emerald-700/40 text-[9px] text-emerald-200/80">
              <div>
                <span className="block font-semibold">Sabuj Shikshayatan High School</span>
                <span>Chattogram, Bangladesh • sabujsghs.edu.bd</span>
              </div>

              <div className="text-right">
                <span className="font-script text-xs text-amber-300 block -mb-0.5">
                  General Secretary
                </span>
                <span className="text-[8px] uppercase tracking-wider text-emerald-300">
                  Authorized Signatory
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions & Wallet Links */}
      <div className="w-full max-w-[420px] mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Show Front Side" : "Flip to QR Pass"}</span>
          </button>

          <button
            onClick={handleShare}
            className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Gate Link</span>
              </>
            )}
          </button>
        </div>

        {/* Digital Wallet Passes */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-emerald-950 block">Mobile Wallet Passes</span>
            <span className="text-[11px] text-emerald-700">Save to your smartphone for offline gate check-in</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/alumni/card/wallet/apple?token=${signedToken || ""}`}
              download={`SSGHS-${card.alumniId}.json`}
              className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <span>Apple</span>
            </a>

            <a
              href={`/api/alumni/card/wallet/google?token=${signedToken || ""}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-emerald-800 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1"
            >
              <span>Google</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
