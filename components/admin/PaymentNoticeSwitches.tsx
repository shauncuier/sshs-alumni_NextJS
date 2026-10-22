"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquare } from "lucide-react";

type Notices = { sms: boolean; email: boolean; updatedAt: string | null; updatedBy: string | null };
type Channel = "sms" | "email";

const ROWS: { key: Channel; label: string; on: string; off: string; Icon: typeof Mail }[] = [
  {
    key: "sms",
    label: "SMS when a payment is confirmed",
    on: "Members and donors get a text when the committee confirms their registration or donation.",
    off: "No text is sent when a payment is confirmed.",
    Icon: MessageSquare,
  },
  {
    key: "email",
    label: "Email when a payment is confirmed",
    on: "Members get their ticket and payment slip by email; donors get their receipt.",
    off: "No email is sent when a payment is confirmed. Members still see their ticket on the dashboard.",
    Icon: Mail,
  },
];

/** Admin → Payments: turn the confirmation SMS and email on or off (lib/payment-notices.ts). */
export default function PaymentNoticeSwitches() {
  const [notices, setNotices] = useState<Notices | null>(null);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/payment-notices", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the confirmation settings.");
        setNotices(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const toggle = async (key: Channel) => {
    if (!notices) return;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-notices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms: notices.sms, email: notices.email, [key]: !notices[key] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change the setting.");
      setNotices(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
      <div>
        <h2 className="text-sm font-black text-slate-900">Payment confirmation messages</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sent when the committee confirms a registration, joining or donation payment.
          {notices?.updatedBy && ` Last changed by ${notices.updatedBy}.`}
        </p>
      </div>
      {ROWS.map(({ key, label, on, off, Icon }) => {
        const value = notices?.[key];
        return (
          <div key={key} className="flex items-center gap-3 justify-between p-3 rounded-xl border border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${value ? "text-emerald-700" : "text-slate-400"}`} />
              <div className="text-xs">
                <p className="font-bold text-slate-900">
                  {label}: <span className={value ? "text-emerald-800" : "text-slate-500"}>{notices ? (value ? "ON" : "OFF") : "…"}</span>
                </p>
                <p className="text-slate-600 mt-0.5">{notices ? (value ? on : off) : ""}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(value)}
              aria-label={label}
              onClick={() => void toggle(key)}
              disabled={!notices || busy !== null}
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${value ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : ""}`} />
            </button>
          </div>
        );
      })}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
    </section>
  );
}
