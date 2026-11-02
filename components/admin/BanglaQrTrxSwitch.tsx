"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";

type Setting = { required: boolean; updatedAt: string | null; updatedBy: string | null };

/**
 * Admin → Settings → Payments: whether confirming a Bangla QR payment needs the TrxID
 * from our OK Wallet SMS. See lib/payments/bangla-qr-setting.ts.
 */
export default function BanglaQrTrxSwitch() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/bangla-qr-trx", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the setting.");
        setSetting(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const change = async (required: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/bangla-qr-trx", {
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

  const on = setting?.required ?? false;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start gap-3">
      <MessageSquareText className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
      <div className="text-xs flex-1">
        <label className="flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
            checked={on}
            disabled={!setting || busy}
            onChange={(e) => void change(e.target.checked)}
          />
          Require the TrxID from our OK Wallet SMS for Bangla QR payments
        </label>
        <p className="text-slate-600 mt-1">
          {!setting
            ? "…"
            : on
              ? "A Bangla QR payment is confirmed only with the TrxID from our SMS, so one SMS can confirm one payment."
              : "Optional: you can confirm a Bangla QR payment without it. A TrxID you do enter is still checked and can confirm one payment only."}
          {setting?.updatedBy && ` Last changed by ${setting.updatedBy}.`}
        </p>
        {error && <p role="alert" className="mt-1 font-bold text-rose-700">{error}</p>}
      </div>
    </div>
  );
}
