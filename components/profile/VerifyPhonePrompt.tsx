"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { OTP_LENGTH } from "@/lib/phone-otp-format";

/**
 * The optional "verify your mobile number" reminder on the profile page (lib/phone-reminder.ts).
 * Sends an SMS code to the number already on file and, once confirmed, marks it verified
 * without opening the edit form. "Later" hides it for this visit only.
 */

const RESEND_SECONDS = 120; // one SMS code every 2 minutes (lib/otp.ts)
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const button = "inline-flex items-center gap-1.5 px-4 min-h-[42px] rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function VerifyPhonePrompt({ phone, onVerified }: { phone: string; onVerified: (phoneVerifiedAt: string) => void }) {
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async () => {
    setError(null);
    setBusy("send");
    try {
      const data = await post("/api/auth/phone-otp", { phone });
      setChallenge(data.challenge);
      setSentTo(data.phone ?? phone);
      setTestCode(typeof data.testCode === "string" ? data.testCode : null);
      setCode(typeof data.testCode === "string" ? data.testCode : "");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!challenge) return;
    setError(null);
    setBusy("verify");
    try {
      const checked = await post("/api/auth/phone-otp/verify", { challenge, code });
      const saved = await post("/api/profile/verify-phone", { phoneVerificationToken: checked.verificationToken });
      setDone(true);
      onVerified(saved.phoneVerifiedAt);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <p id="verify-phone" role="status" className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-900">
        <CheckCircle2 className="w-4 h-4 shrink-0" /> Your mobile number is verified. Thank you!
      </p>
    );
  }
  if (hidden) return null;

  return (
    <section id="verify-phone" aria-labelledby="verify-phone-title" className="scroll-mt-24 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 id="verify-phone-title" className="text-sm font-black text-slate-900">Verify your mobile number</h2>
          <p className="text-xs text-slate-700 leading-relaxed">
            Your number <span className="font-bold tabular-nums">{phone}</span> is not verified yet. It is optional and takes a minute: we text a code to it.
            A verified number lets you reset your password by SMS.
          </p>
        </div>
      </div>

      {!challenge ? (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <button type="button" onClick={() => void send()} disabled={busy !== null} className={button}>
            {busy === "send" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Verify now
          </button>
          <button type="button" onClick={() => setHidden(true)} className="px-3 min-h-[42px] text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer">
            Later
          </button>
        </div>
      ) : (
        <div className="space-y-2 pl-8">
          {testCode && (
            <p role="status" className="p-2.5 rounded-xl bg-white border border-amber-300 text-[11px] font-bold text-amber-900">
              TEST MODE: no SMS was sent. Your code is {testCode} (filled in below). Tap Confirm.
            </p>
          )}
          <label htmlFor="verify-phone-code" className="block text-xs font-semibold text-slate-700">Code sent to {sentTo} by SMS</label>
          <div className="flex gap-2 max-w-sm">
            <input
              id="verify-phone-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9]{${OTP_LENGTH}}`}
              maxLength={OTP_LENGTH}
              placeholder={`${OTP_LENGTH}-digit code`}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base sm:text-sm tracking-[0.3em] min-h-[42px] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === OTP_LENGTH) void verify();
              }}
            />
            <button type="button" onClick={() => void verify()} disabled={busy !== null || code.length !== OTP_LENGTH} className={button}>
              {busy === "verify" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy !== null || resendIn > 0}
            className="text-[11px] font-bold text-emerald-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
          >
            {resendIn > 0 ? `Resend code in ${mmss(resendIn)}` : "Resend code"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="pl-8 text-xs font-bold text-rose-700">{error}</p>}
    </section>
  );
}
