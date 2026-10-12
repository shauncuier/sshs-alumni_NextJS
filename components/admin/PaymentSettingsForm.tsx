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
  note: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";

/** bKash / Nagad numbers, bank details and the Bangla QR image members pay to. */
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
      setNotice("Saved. The donate page and the join form show the new details now.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const number = (key: "bkashNumber" | "nagadNumber", typeKey: "bkashType" | "nagadType", name: string) => (
    <div>
      <label htmlFor={`ps-${key}`} className={label}>{name} number</label>
      <div className="flex gap-2">
        <input id={`ps-${key}`} inputMode="tel" className={input} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="01XXXXXXXXX" />
        <select aria-label={`${name} account type`} className={`${input} w-auto`} value={form[typeKey]} onChange={(e) => set(typeKey, e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <form onSubmit={save} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-700" /> Payment details</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Shown on the donate page and the join form. Every change is recorded in the activity log.
          {form.updatedAt && ` Last changed ${new Date(form.updatedAt).toLocaleString()}${form.updatedBy ? ` by ${form.updatedBy}` : ""}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {number("bkashNumber", "bkashType", "bKash")}
        {number("nagadNumber", "nagadType", "Nagad")}
      </div>

      <div>
        <label htmlFor="ps-bank" className={label}>Bank account <span className="font-normal text-slate-400">(one item per line)</span></label>
        <textarea id="ps-bank" rows={3} className={input} value={form.bankDetails} maxLength={1000} onChange={(e) => set("bankDetails", e.target.value)} placeholder={"Account name: SSGHS Alumni Association\nA/C 0000000000000, Sonali Bank, Sitakunda branch\nRouting 000000000"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div>
          <span className={label}>Bangla QR image</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
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

      <div>
        <label htmlFor="ps-note" className={label}>Extra note <span className="font-normal text-slate-400">(optional)</span></label>
        <textarea id="ps-note" rows={2} className={input} value={form.note} maxLength={1000} onChange={(e) => set("note", e.target.value)} placeholder="Write your name and batch in the reference." />
      </div>

      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-xs font-bold text-emerald-800">{notice}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving || uploading} className="px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save payment details
        </button>
      </div>
    </form>
  );
}
