"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  School,
  Clock,
  MapPin,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface VerificationResponse {
  valid: boolean;
  securityStatus?: string;
  error?: string;
  alumnus?: {
    alumniId: string;
    fullName: string;
    sscBatch: number;
    membershipTier: string;
    bloodGroup?: string;
    profession?: string;
    eiin: string;
    issuedAt: string;
    expiresAt: string;
  };
  gateCheckin?: {
    gateId: string;
    verifiedAt: string;
    scannedBy: string;
  };
}

export default function VerifyTokenPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!token) return;
      try {
        const res = await fetch("/api/alumni/card/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, gateId: "MAIN_CAMPUS_GATE_1" }),
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Verification failed", err);
        setData({ valid: false, error: "Network or server connection failed." });
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10">
      {/* Top Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <School className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
              SSGHS Gate Control
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">
              EIIN 105070 • Official Verification Portal
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
          GATE-1
        </span>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        {loading ? (
          <div className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Decrypting Pass Signature</h3>
              <p className="text-xs text-slate-400">Verifying cryptographic hash with alumni authority...</p>
            </div>
          </div>
        ) : data?.valid && data.alumnus ? (
          <div className="bg-gradient-to-b from-emerald-950/80 to-slate-900 rounded-3xl p-6 sm:p-8 border border-emerald-500/50 shadow-2xl space-y-6">
            {/* Status Header Badge */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 uppercase tracking-wider">
                Official Alumnus Verified
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {data.alumnus.fullName}
              </h2>
              <p className="text-xs text-emerald-200">
                {data.alumnus.profession || "Distinguished Member"}
              </p>
            </div>

            {/* Credentials Grid */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">SSC Graduation Batch:</span>
                <span className="font-bold text-amber-400 text-sm">
                  Batch {data.alumnus.sscBatch}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Alumni Pass ID:</span>
                <span className="font-mono font-bold text-slate-200">
                  {data.alumnus.alumniId}
                </span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Membership Tier:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                  {data.alumnus.membershipTier}
                </span>
              </div>

              {data.alumnus.bloodGroup && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {data.alumnus.bloodGroup}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-400">School Code:</span>
                <span className="font-bold text-slate-300">
                  EIIN {data.alumnus.eiin}
                </span>
              </div>
            </div>

            {/* Check-in Action for Reunion Staff */}
            <div className="pt-2 space-y-3">
              {checkedIn ? (
                <div className="p-3.5 bg-emerald-900/60 border border-emerald-500 rounded-2xl text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300">
                    <UserCheck className="w-4 h-4" />
                    <span>Gate Check-in Confirmed!</span>
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    Alumnus delegate kit and meal coupons may be issued.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setCheckedIn(true)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirm Gate Check-In &amp; Issue Delegate Kit</span>
                </button>
              )}

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Logged at {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-950/60 rounded-3xl p-8 border border-rose-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-rose-500/20 border-2 border-rose-400 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-white">Verification Failed</h3>
              <p className="text-xs text-rose-300">
                {data?.error || "This QR code or pass is invalid, expired, or has an invalid signature."}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 pt-2">
              Please direct the alumnus to the Help Desk at the School Administrative Building.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center text-[10px] text-slate-500 border-t border-slate-800 pt-4">
        <span>Sabuj Shikshayatan Government High School Alumni Association</span>
        <div className="mt-1">
          <Link href="/card" className="text-emerald-400 hover:underline">
            View My Digital Card
          </Link>
        </div>
      </div>
    </div>
  );
}
