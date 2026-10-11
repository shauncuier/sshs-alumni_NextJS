"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { OTP_LENGTH } from "@/lib/phone-otp-format";

const input = "w-full px-3.5 py-3 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[46px] focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const smallButton = "shrink-0 px-3.5 min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer flex items-center gap-1.5";
const RESEND_SECONDS = 60;

export type ContactVerification = { via: "phone" | "email"; token: string; target: string };
type Channel = ContactVerification["via"];

const ENDPOINTS: Record<Channel, string> = { phone: "/api/auth/phone-otp", email: "/api/auth/email-otp" };

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

/**
 * Mobile number with SMS code verification, and an email code as the fallback when
 * the SMS fails or never arrives. Reports the verification (or null when it no longer
 * holds) through onVerification; registration needs one of the two.
 */
export default function ContactVerifyField({
  phone,
  onPhoneChange,
  email,
  verification,
  onVerification,
  showRequired,
}: {
  phone: string;
  onPhoneChange: (phone: string) => void;
  /** The email typed elsewhere on the form; the fallback code goes there. */
  email: string;
  verification: ContactVerification | null;
  onVerification: (v: ContactVerification | null) => void;
  /** Set once the member tried to continue without verifying. */
  showRequired: boolean;
}) {
  const [channel, setChannel] = useState<Channel>("phone");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Channel | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smsFailed, setSmsFailed] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const reset = () => {
    setChallenge(null);
    setCode("");
    setError(null);
  };

  const changePhone = (value: string) => {
    onPhoneChange(value);
    // An email verification does not depend on the phone number.
    if (verification?.via === "phone") onVerification(null);
    if (channel === "phone") reset();
    setSmsFailed(false);
  };

  const sendCode = async (via: Channel) => {
    setError(null);
    setBusy(via);
    try {
      const data = await post(ENDPOINTS[via], via === "phone" ? { phone } : { email });
      setChannel(via);
      setChallenge(data.challenge);
      setSentTo(via === "phone" ? data.phone : data.email);
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError((err as Error).message);
      if (via === "phone") setSmsFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async () => {
    if (!challenge) return;
    setError(null);
    setBusy("verify");
    try {
      const data = await post(`${ENDPOINTS[channel]}/verify`, { challenge, code });
      if (channel === "phone") onPhoneChange(data.phone);
      onVerification({ via: channel, token: data.verificationToken, target: channel === "phone" ? data.phone : data.email });
      setChallenge(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const verified = Boolean(verification);
  const phoneLocked = verification?.via === "phone";
  // Offer email once the SMS failed, or while waiting for an SMS code that may not come.
  const offerEmail = !verified && (smsFailed || (challenge !== null && channel === "phone"));
  const message = error ?? (showRequired && !verified ? "Please verify your mobile number with the SMS code, or by email if the SMS does not arrive." : null);

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
          readOnly={phoneLocked}
          placeholder="01XXXXXXXXX"
          className={`${input} ${phoneLocked ? "bg-emerald-50 border-emerald-300" : ""}`}
          value={phone}
          onChange={(e) => changePhone(e.target.value)}
          aria-describedby="reg-phone-help"
        />
        {verified ? (
          <button
            type="button"
            onClick={() => {
              onVerification(null);
              reset();
            }}
            className="shrink-0 px-3.5 min-h-[46px] rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Change
          </button>
        ) : (
          !(challenge && channel === "phone") && (
            <button type="button" onClick={() => void sendCode("phone")} disabled={busy !== null || !phone.trim()} className={smallButton}>
              {busy === "phone" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Send code
            </button>
          )
        )}
      </div>

      {verification ? (
        <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {verification.via === "phone" ? "Number verified by SMS" : `Verified by email (${verification.target})`}
        </p>
      ) : (
        <p id="reg-phone-help" className="text-[11px] text-slate-500">
          A Bangladeshi mobile number. We text you a {OTP_LENGTH}-digit code to confirm it.
        </p>
      )}

      {challenge && !verified && (
        <div className="space-y-1.5">
          <label htmlFor="reg-otp" className={label}>
            Code sent to {sentTo} {channel === "email" ? "by email" : "by SMS"}
          </label>
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
            <button type="button" onClick={() => void verifyCode()} disabled={busy !== null || code.length !== OTP_LENGTH} className={smallButton}>
              {busy === "verify" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Verify
            </button>
          </div>
          <button
            type="button"
            onClick={() => void sendCode(channel)}
            disabled={busy !== null || resendIn > 0}
            className="text-[11px] font-bold text-emerald-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      )}

      {offerEmail && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <span>{smsFailed ? "SMS could not be sent." : "SMS not arriving?"} Get the code by email{email.trim() ? ` at ${email.trim()}` : " (fill in your email above first)"}.</span>
          <button
            type="button"
            onClick={() => void sendCode("email")}
            disabled={busy !== null || !email.trim()}
            className="shrink-0 px-3 py-2 rounded-lg border border-emerald-700 text-emerald-800 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === "email" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Email me the code
          </button>
        </div>
      )}

      {message && <p role="alert" className="text-[11px] font-bold text-rose-700">{message}</p>}
    </div>
  );
}
