"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquare } from "lucide-react";

type Setting = { sms: boolean; email: boolean; updatedAt: string | null; updatedBy: string | null };
type Channel = "sms" | "email";

const ROWS: { key: Channel; label: string; on: string; off: string; Icon: typeof Mail }[] = [
  {
    key: "email",
    label: "Email about unread messages",
    on: "Members get an email when a direct message is still unread after an hour (at most every 6 hours).",
    off: "No reminder emails are sent. Members still see new messages in the bell.",
    Icon: Mail,
  },
  {
    key: "sms",
    label: "SMS about unread messages",
    on: "Members with a verified number also get a text (at most every 6 hours).",
    off: "No reminder texts are sent.",
    Icon: MessageSquare,
  },
];

/** Admin → Settings: turn the unread-message reminders on or off for everyone (lib/message-reminders-setting.ts). */
export default function MessageReminderSwitches() {
  const [setting, setSetting] = useState<Setting | null>(null);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/message-reminders", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the reminder settings.");
        setSetting(body);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const toggle = async (key: Channel) => {
    if (!setting) return;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/message-reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms: setting.sms, email: setting.email, [key]: !setting[key] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change the setting.");
      setSetting(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
      <div>
        <h2 className="text-sm font-black text-slate-900">Unread message reminders</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sent when a direct message is still unread an hour after it arrived. Each member can also turn them off in their own Settings.
          {setting?.updatedBy && ` Last changed by ${setting.updatedBy}.`}
        </p>
      </div>
      {ROWS.map(({ key, label, on, off, Icon }) => {
        const value = setting?.[key];
        return (
          <div key={key} className="flex items-center gap-3 justify-between p-3 rounded-xl border border-slate-200">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${value ? "text-emerald-700" : "text-slate-400"}`} />
              <div className="text-xs">
                <p className="font-bold text-slate-900">
                  {label}: <span className={value ? "text-emerald-800" : "text-slate-500"}>{setting ? (value ? "ON" : "OFF") : "…"}</span>
                </p>
                <p className="text-slate-600 mt-0.5">{setting ? (value ? on : off) : ""}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(value)}
              aria-label={label}
              onClick={() => void toggle(key)}
              disabled={!setting || busy !== null}
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
