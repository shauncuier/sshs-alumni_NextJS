"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { OTP_LENGTH } from "@/lib/phone-otp-format";

const input = "w-full px-3.5 py-3 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[46px] focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const smallButton = "shrink-0 px-3.5 min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer flex items-center gap-1.5";
const RESEND_SECONDS = 60;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

/**
 * Phone number with SMS code verification. Reports the "phone verified" token through
 * onVerified (null whenever the number changes), which registration requires.
 */
export default function PhoneVerifyField({
  phone,
  onPhoneChange,
  verified,
  onVerified,
  showRequired,
}: {
  phone: string;
  onPhoneChange: (phone: string) => void;
  verified: boolean;
  onVerified: (token: string | null) => void;
  /** Set once the member tried to continue without verifying. */
  showRequired: boolean;
}) {
  const [challenge, setChallenge] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const changePhone = (value: string) => {
    onPhoneChange(value);
    onVerified(null);
    setChallenge(null);
    setCode("");
    setError(null);
  };

  const sendCode = async () => {
    setError(null);
    setBusy("send");
    try {
      const data = await post("/api/auth/phone-otp", { phone });
      setChallenge(data.challenge);
      setSentTo(data.phone);
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async () => {
    if (!challenge) return;
    setError(null);
    setBusy("verify");
    try {
      const data = await post("/api/auth/phone-otp/verify", { challenge, code });
      onPhoneChange(data.phone);
      onVerified(data.verificationToken);
      setChallenge(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const message = error ?? (showRequired && !verified ? "Please verify your phone number with the SMS code." : null);

  return (
    <div className="sm:col-span-2 space-y-2">
      <label htmlFor="reg-phone" className={label}>Mobile number *</label>
      <div className="flex gap-2">
        <input
          id="reg-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          readOnly={verified}
          placeholder="01XXXXXXXXX"
          className={`${input} ${verified ? "bg-emerald-50 border-emerald-300" : ""}`}
          value={phone}
          onChange={(e) => changePhone(e.target.value)}
          aria-describedby="reg-phone-help"
        />
        {verified ? (
          <button type="button" onClick={() => changePhone(phone)} className="shrink-0 px-3.5 min-h-[46px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer">
            Change
          </button>
        ) : (
          !challenge && (
            <button type="button" onClick={sendCode} disabled={busy !== null || !phone.trim()} className={smallButton}>
              {busy === "send" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Send code
            </button>
          )
        )}
      </div>

      {verified ? (
        <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Number verified
        </p>
      ) : (
        <p id="reg-phone-help" className="text-[11px] text-slate-500">
          A Bangladeshi mobile number. We text you a {OTP_LENGTH}-digit code to confirm it.
        </p>
      )}

      {challenge && !verified && (
        <div className="space-y-1.5">
          <label htmlFor="reg-otp" className={label}>Code sent to {sentTo}</label>
          <div className="flex gap-2">
            <input
              id="reg-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9]{${OTP_LENGTH}}`}
              maxLength={OTP_LENGTH}
              placeholder={`${OTP_LENGTH}-digit code`}
              className={`${input} tracking-[0.3em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                // Enter here verifies the code instead of submitting the whole form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (code.length === OTP_LENGTH) void verifyCode();
                }
              }}
            />
            <button type="button" onClick={verifyCode} disabled={busy !== null || code.length !== OTP_LENGTH} className={smallButton}>
              {busy === "verify" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Verify
            </button>
          </div>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy !== null || resendIn > 0}
            className="text-[11px] font-bold text-emerald-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      )}

      {message && <p role="alert" className="text-[11px] font-bold text-rose-700">{message}</p>}
    </div>
  );
}
