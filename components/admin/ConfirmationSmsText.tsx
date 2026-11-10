"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { calculateSmsMetrics } from "@/lib/bulksmsbd";

type SmsText = { text: string; isDefault: boolean; defaultText: string; updatedAt: string | null; updatedBy: string | null };

const SAMPLE_LINK = "https://www.exsabujian.org/dashboard";
const preview = (text: string) => text.replaceAll("{event}", "Golden Jubilee").replaceAll("{link}", SAMPLE_LINK);

/** Admin → Settings → Payments: the wording of the "registration confirmed" SMS (lib/sms-text.ts). */
export default function ConfirmationSmsText() {
  const [saved, setSaved] = useState<SmsText | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sms-text", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the SMS text.");
        setSaved(body);
        setDraft(body.text);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const save = async (text: string | null) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/sms-text", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save the SMS text.");
      setSaved(body);
      setDraft(body.text);
      setNotice(body.isDefault ? "Back to the default text." : "Saved. The next confirmation SMS uses this text.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filled = preview(draft.replace(/\s+/g, " ").trim());
  const m = calculateSmsMetrics(filled);
  const changed = saved !== null && draft.replace(/\s+/g, " ").trim() !== saved.text;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3">
      <div className="flex items-start gap-3">
        <MessageSquareText className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
        <div>
          <h2 className="text-sm font-black text-slate-900">Registration confirmed SMS</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            The text a member gets when the committee confirms their registration. <code className="font-mono">{"{event}"}</code> becomes
            &ldquo;Golden Jubilee&rdquo; (or &ldquo;event&rdquo; for other events) and <code className="font-mono">{"{link}"}</code> the dashboard link.
            {saved?.updatedBy && !saved.isDefault && ` Last changed by ${saved.updatedBy}.`}
          </p>
        </div>
      </div>

      <label htmlFor="confirmation-sms" className="sr-only">Registration confirmed SMS text</label>
      <textarea
        id="confirmation-sms"
        rows={3}
        maxLength={320}
        value={draft}
        disabled={!saved || busy}
        onChange={(e) => setDraft(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
      />

      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
        <p className="font-bold text-slate-700">The member sees</p>
        <p className="text-slate-900 break-words">{filled || "—"}</p>
        <p className={m.partsCount > 1 || m.isUnicode ? "font-bold text-amber-800" : "text-slate-500"}>
          {m.charCount} characters · {m.partsCount} SMS{m.isUnicode ? " · Bangla or special letters: Unicode, costs 2–3 times more" : ""}
        </p>
        {!draft.includes("{link}") && <p className="font-bold text-amber-800">No {"{link}"}: members won&apos;t get the link to their ticket.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save(draft)}
          disabled={!changed || busy || !draft.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save text"}
        </button>
        {saved && !saved.isDefault && (
          <button
            type="button"
            onClick={() => void save(null)}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-50"
          >
            Reset to default
          </button>
        )}
      </div>
      {notice && <p className="text-xs font-bold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
    </section>
  );
}
