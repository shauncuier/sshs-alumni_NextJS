"use client";

import React, { useEffect, useState } from "react";
import { ImagePlus, Loader2, Wallet } from "lucide-react";

interface Settings {
  bkashNumber: string;
  bkashType: string;
  nagadNumber: string;
  nagadType: string;
  bankDetails: string;
  banglaQrImage: string;
  banglaQrMerchant: string;
  cashDetails: string;
  note: string;
  enabledMethods: string[];
  updatedAt: string | null;
  updatedBy: string | null;
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

/** Every way members can pay, for the whole site: each method switched on or off, with its details. */
export default function PaymentSettingsForm() {
  const [form, setForm] = useState<Settings | null>(null);
  const [types, setTypes] = useState<string[]>(["Personal", "Agent", "Merchant"]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/payment-settings", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load the payment details.");
        setForm(data.settings);
        if (Array.isArray(data.accountTypes)) setTypes(data.accountTypes);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (!form) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-xs text-slate-500">
        {error ? <span className="text-rose-700 font-bold">{error}</span> : "Loading payment details…"}
      </div>
    );
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const uploadQr = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      set("banglaQrImage", data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Members will send money to these numbers and accounts. Save them?")) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/payment-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the payment details.");
      setForm(data.settings);
      setNotice("Saved. Event registration, joining and the donate page use these now.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const on = (method: string) => form.enabledMethods.includes(method);
  const toggle = (method: string, value: boolean) =>
    set("enabledMethods", value ? [...form.enabledMethods.filter((m) => m !== method), method] : form.enabledMethods.filter((m) => m !== method));

  // One card per method: the switch, then the details members need for it.
  const card = (method: string, title: string, hint: string, body: React.ReactNode) => (
    <fieldset className={`p-4 rounded-2xl border space-y-3 ${on(method) ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200 bg-slate-50/50"}`}>
      <legend className="sr-only">{title}</legend>
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span>
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          <span className="block text-[11px] text-slate-500">{hint}</span>
        </span>
        <span className="flex items-center gap-2 text-xs font-bold">
          <span className={on(method) ? "text-emerald-800" : "text-slate-400"}>{on(method) ? "On" : "Off"}</span>
          <input type="checkbox" className="w-5 h-5 accent-emerald-700" checked={on(method)} onChange={(e) => toggle(method, e.target.checked)} />
        </span>
      </label>
      <div className={on(method) ? "" : "opacity-60"}>{body}</div>
    </fieldset>
  );

  const typeSelect = (typeKey: "bkashType" | "nagadType", name: string) => (
    <select aria-label={`${name} account type`} className={`${input} w-auto`} value={form[typeKey]} onChange={(e) => set(typeKey, e.target.value)}>
      {types.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  );

  return (
    <form onSubmit={save} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-700" /> Payment methods</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          One place for the whole site: event registration, joining the association and donations offer only the methods switched on here.
          Every change is recorded in the activity log.
          {form.updatedAt && ` Last changed ${new Date(form.updatedAt).toLocaleString()}${form.updatedBy ? ` by ${form.updatedBy}` : ""}.`}
        </p>
      </div>

      {form.enabledMethods.length === 0 && (
        <p role="status" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          No method is switched on: paid events stay closed (&quot;Payment details coming soon&quot;) unless an event gives its own instructions.
        </p>
      )}

      {card("bKash", "bKash", "Members send money and enter the TrxID.", (
        <div>
          <label htmlFor="ps-bkashNumber" className={label}>bKash number</label>
          <div className="flex gap-2">
            <input id="ps-bkashNumber" inputMode="tel" className={input} value={form.bkashNumber} onChange={(e) => set("bkashNumber", e.target.value)} placeholder="01XXXXXXXXX" />
            {typeSelect("bkashType", "bKash")}
          </div>
        </div>
      ))}

      {card("Nagad", "Nagad", "Members send money and enter the TrxID.", (
        <div>
          <label htmlFor="ps-nagadNumber" className={label}>Nagad number</label>
          <div className="flex gap-2">
            <input id="ps-nagadNumber" inputMode="tel" className={input} value={form.nagadNumber} onChange={(e) => set("nagadNumber", e.target.value)} placeholder="01XXXXXXXXX" />
            {typeSelect("nagadType", "Nagad")}
          </div>
        </div>
      ))}

      {card("Bangla QR", "Bangla QR", "Any bank or mobile banking app can scan and pay.", (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <span className={label}>Bangla QR image</span>
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                {form.banglaQrImage ? <img loading="lazy" decoding="async" src={form.banglaQrImage} alt="Bangla QR" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="space-y-1.5">
                <label className={`${ghost} w-fit`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {form.banglaQrImage ? "Replace" : "Upload"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void uploadQr(e.target.files?.[0])} />
                </label>
                {form.banglaQrImage && <button type="button" onClick={() => set("banglaQrImage", "")} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>}
                <p className="text-[10px] text-slate-400">The QR image from the bank, at least 320 px.</p>
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="ps-merchant" className={label}>Merchant name printed with the QR</label>
            <input id="ps-merchant" className={input} value={form.banglaQrMerchant} maxLength={120} onChange={(e) => set("banglaQrMerchant", e.target.value)} placeholder="SSGHS Alumni Association" />
          </div>
        </div>
      ))}

      {card("Bank", "Bank transfer / deposit", "Members pay into the account and enter the transaction reference.", (
        <div>
          <label htmlFor="ps-bank" className={label}>Bank account <span className="font-normal text-slate-400">(one item per line)</span></label>
          <textarea id="ps-bank" rows={3} className={input} value={form.bankDetails} maxLength={1000} onChange={(e) => set("bankDetails", e.target.value)} placeholder={"Account name: SSGHS Alumni Association\nA/C 0000000000000, Sonali Bank, Sitakunda branch\nRouting 000000000"} />
        </div>
      ))}

      {card("Cash", "Cash", "Paid in person; the committee member gives a receipt number.", (
        <div>
          <label htmlFor="ps-cash" className={label}>Where and to whom <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id="ps-cash" rows={2} className={input} value={form.cashDetails} maxLength={500} onChange={(e) => set("cashDetails", e.target.value)} placeholder="School office, Friday 10 am – 1 pm, to the treasurer" />
        </div>
      ))}

      <div>
        <label htmlFor="ps-note" className={label}>Note for every payment <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea id="ps-note" rows={2} className={input} value={form.note} maxLength={1000} onChange={(e) => set("note", e.target.value)} placeholder="Write your name and batch in the reference." />
      </div>

      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-xs font-bold text-emerald-800">{notice}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving || uploading} className="px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save payment settings
        </button>
      </div>
    </form>
  );
}
