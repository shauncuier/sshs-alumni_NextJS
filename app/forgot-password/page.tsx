"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Phone } from "lucide-react";
import PasswordInput from "@/components/shared/PasswordInput";
import { useTurnstile } from "@/components/shared/useTurnstile";
import { OTP_LENGTH } from "@/lib/phone-otp-format";
import { schoolInfo } from "@/lib/data";

// Matches the server: one SMS per number every 2 minutes (lib/phone-otp.ts).
const RESEND_SECONDS = 120;
const MIN_PASSWORD_LENGTH = 8;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const input =
  "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800 text-base sm:text-xs";
const button =
  "w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

type Step = "phone" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  // Each code sent needs a fresh robot check (a token works once).
  const bot = useTurnstile("password_reset", { enabled: step === "phone" || step === "code" });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setError(null);
    setBusy(true);
    const turnstileToken = bot.token ?? undefined;
    bot.reset();
    try {
      const data = await post("/api/auth/password-reset/request", { phone, turnstileToken });
      setChallenge(data.challenge);
      setSentTo(data.phone);
      setCode("");
      setResendIn(RESEND_SECONDS);
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setBusy(true);
    try {
      const data = await post("/api/auth/phone-otp/verify", { challenge, code });
      setToken(data.verificationToken);
      setStep("password");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      const data = await post("/api/auth/password-reset", { verificationToken: token, newPassword: password });
      setEmail(data.email ?? "");
      setPassword("");
      setConfirm("");
      setStep("done");
    } catch (err) {
      setError((err as Error).message);
      // An expired or used verification: start again from the number.
      if (/verify|code/i.test((err as Error).message)) {
        setToken(null);
        setChallenge(null);
        setStep("phone");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#041a13] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        <Link href="/" className="inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full p-1 shadow-xl flex items-center justify-center ring-2 ring-amber-400/60 bg-white overflow-hidden">
            <NextImage src="/logo.png" alt="প্রাক্তন সবুজিয়ান পরিষদ Official Crest" width={64} height={64} className="w-full h-full object-contain rounded-full" priority />
          </div>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Reset your password</h1>
        <p className="text-xs text-emerald-300 mt-1">With a code sent to the mobile number on your account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-emerald-800/40 text-xs space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === "phone" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="fp-phone" className="block font-semibold text-slate-700 mb-1">Mobile number on your account</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input id="fp-phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} pl-10`} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">We text a {OTP_LENGTH}-digit code to this number.</p>
              </div>
              {bot.widget}
              <button type="submit" disabled={busy || !phone.trim() || !bot.ready} className={button}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send code
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <label htmlFor="fp-code" className="block font-semibold text-slate-700 mb-1">Code sent to {sentTo}</label>
                <input
                  id="fp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern={`[0-9]{${OTP_LENGTH}}`}
                  maxLength={OTP_LENGTH}
                  required
                  placeholder={`${OTP_LENGTH}-digit code`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${input} tracking-[0.3em]`}
                />
              </div>
              <button type="submit" disabled={busy || code.length !== OTP_LENGTH} className={button}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Verify code
              </button>
              <div className="space-y-2">
                {resendIn <= 0 && bot.widget}
                <div className="flex justify-between gap-2">
                  <button type="button" onClick={() => { setStep("phone"); setChallenge(null); setError(null); }} className="text-[11px] font-bold text-slate-600 cursor-pointer">
                    Change number
                  </button>
                  <button type="button" onClick={() => void sendCode()} disabled={busy || resendIn > 0 || !bot.ready} className="text-[11px] font-bold text-emerald-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed">
                    {resendIn > 0 ? `Resend code in ${mmss(resendIn)}` : "Resend code"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={savePassword} className="space-y-4">
              <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Number verified. Choose a new password.
              </p>
              <div>
                <label htmlFor="fp-new" className="block font-semibold text-slate-700 mb-1">New password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                  <PasswordInput id="fp-new" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} pl-10`} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">At least {MIN_PASSWORD_LENGTH} characters.</p>
              </div>
              <div>
                <label htmlFor="fp-confirm" className="block font-semibold text-slate-700 mb-1">Type it again</label>
                <PasswordInput id="fp-confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
              </div>
              <button type="submit" disabled={busy} className={button}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save new password
              </button>
              <p className="text-[11px] text-slate-500">You will be signed out on every device; sign in again with the new password.</p>
            </form>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Password changed</p>
              {email && <p className="text-slate-600">Sign in with <span className="font-semibold">{email}</span> and your new password.</p>}
              <Link href="/login" className={button}>Go to sign in</Link>
            </div>
          )}

          {step !== "done" && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
              <p className="text-[11px] text-slate-500">
                No number on your account, or no longer have it?{" "}
                <a href={`mailto:${schoolInfo.associationEmail}?subject=${encodeURIComponent("Password reset")}`} className="font-semibold text-emerald-700 underline">
                  Ask the committee
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
