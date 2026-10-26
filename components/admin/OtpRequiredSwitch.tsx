"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

type Setting = { required: boolean; updatedAt: string | null; updatedBy: string | null };

/**
 * Admin → Bulk SMS: whether joining members (and members changing their number) must
 * verify it with a one-time code. See lib/otp-setting.ts.
 */
export default function OtpRequiredSwitch() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sms/otp-required", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the setting.");
        setSetting(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const change = async (required: boolean) => {
    if (!setting) return;
    if (!required && !window.confirm("Stop asking for a verification code?\n\nMembers join and change their number without an SMS code, so nobody checks the number is really theirs.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sms/otp-required", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ required }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change the setting.");
      setSetting(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const on = setting?.required ?? true;
  const Icon = on ? ShieldCheck : ShieldOff;

  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${on ? "bg-white border-slate-200" : "bg-amber-50 border-amber-300"}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${on ? "text-emerald-700" : "text-amber-700"}`} />
      <div className="text-xs flex-1">
        <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
            checked={on}
            disabled={!setting || busy}
            onChange={(e) => void change(e.target.checked)}
          />
          Require OTP verification (mobile number code)
        </label>
        <p className="text-slate-600 mt-1">
          {!setting
            ? "…"
            : on
              ? "New members and members changing their number must enter the code we send."
              : `Off: no code is asked; numbers are accepted as typed${setting.updatedBy ? ` (switched off by ${setting.updatedBy})` : ""}. Each number can still belong to one account only.`}
        </p>
        {error && <p role="alert" className="mt-1 font-bold text-rose-700">{error}</p>}
      </div>
    </div>
  );
}
