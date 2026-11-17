"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Mail, MessageSquare } from "lucide-react";

type Prefs = { messageEmailReminders: boolean; messageSmsReminders: boolean; hasPhone: boolean; phoneVerified: boolean };
type Key = "messageEmailReminders" | "messageSmsReminders";

/** Settings → Notifications: the member's own email/SMS reminders about unread messages. */
export default function MessageReminderPrefs() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState<Key | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/notification-preferences", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load your notification settings.");
        setPrefs(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const toggle = async (key: Key) => {
    if (!prefs) return;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/me/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !prefs[key] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save the setting.");
      setPrefs(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const smsNote = !prefs
    ? ""
    : !prefs.hasPhone
      ? "Add a mobile number to your profile to get texts."
      : !prefs.phoneVerified
        ? "Texts go only to a verified number."
        : "";

  const rows: { key: Key; label: string; help: string; Icon: typeof Mail; disabled: boolean }[] = [
    { key: "messageEmailReminders", label: "Email me about unread messages", help: "When a message is still unread after an hour; at most every 6 hours.", Icon: Mail, disabled: false },
    { key: "messageSmsReminders", label: "Text me about unread messages", help: "Same, by SMS to your mobile number.", Icon: MessageSquare, disabled: Boolean(prefs && !prefs.phoneVerified) },
  ];

  return (
    <section aria-labelledby="notif-title" className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
        <Bell className="w-5 h-5 text-emerald-700" />
        <h2 id="notif-title">Notifications</h2>
      </div>
      {rows.map(({ key, label, help, Icon, disabled }) => {
        const value = prefs?.[key];
        return (
          <div key={key} className="flex items-center gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0 text-xs">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${value && !disabled ? "text-emerald-700" : "text-slate-400"}`} aria-hidden />
              <div>
                <p className="font-bold text-slate-900">{label}</p>
                <p className="text-slate-500 mt-0.5">{help}</p>
                {key === "messageSmsReminders" && smsNote && (
                  <p className="text-amber-800 font-semibold mt-0.5">
                    {smsNote}{" "}
                    <Link href="/profile#verify-phone" className="underline">
                      {prefs?.hasPhone ? "Verify your number" : "Open your profile"}
                    </Link>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(value) && !disabled}
              aria-label={label}
              onClick={() => void toggle(key)}
              disabled={!prefs || busy !== null || disabled}
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${value && !disabled ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${value && !disabled ? "translate-x-6" : ""}`} />
            </button>
          </div>
        );
      })}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
    </section>
  );
}
