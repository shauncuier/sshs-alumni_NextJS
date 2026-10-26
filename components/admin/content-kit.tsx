"use client";

import React, { useState } from "react";
import { AlertCircle, FileText, ImagePlus, Loader2, X } from "lucide-react";

/**
 * Small building blocks shared by the association content admin pages (committee,
 * honor board, constitution, notices): the same field styles, JSON helper, dialog,
 * banners and upload fields as /admin/news.
 */

export const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
export const label = "block text-xs font-semibold text-slate-700 mb-1.5";
export const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
export const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
export const danger = `${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`;

export async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

async function upload(url: string, field: string, file: File): Promise<string> {
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed.");
  return data.url;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Banners({ error, notice, onDismiss }: { error: string | null; notice: string | null; onDismiss: () => void }) {
  return (
    <>
      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div role="status" className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}
    </>
  );
}

/** Upload or remove one image (through /api/admin/media); reports busy state and errors to the parent. */
export function ImageField({
  value,
  onChange,
  onError,
  onBusy,
  title = "Photo",
  hint = "JPEG, PNG or WebP, at least 320 px, up to 8 MB.",
  portrait = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (message: string | null) => void;
  onBusy?: (busy: boolean) => void;
  title?: string;
  hint?: string;
  portrait?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    setBusy(true);
    onBusy?.(true);
    try {
      onChange(await upload("/api/admin/media", "image", file));
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };
  return (
    <div>
      <span className={label}>{title}</span>
      <div className="flex items-center gap-3">
        <div className={`${portrait ? "w-20 h-24" : "w-32 h-20"} rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center`}>
          {value ? <img loading="lazy" decoding="async" src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
        </div>
        <div className="space-y-1.5">
          <label className={`${ghost} w-fit`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {value ? "Replace" : "Upload"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>
          )}
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

/** Upload or remove one PDF (through /api/admin/documents). */
export function PdfField({
  value,
  onChange,
  onError,
  onBusy,
  title = "PDF",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  onError: (message: string | null) => void;
  onBusy?: (busy: boolean) => void;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    onError(null);
    setBusy(true);
    onBusy?.(true);
    try {
      onChange(await upload("/api/admin/documents", "file", file));
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };
  return (
    <div>
      <span className={label}>{title}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 underline">
            <FileText className="w-4 h-4" /> Open uploaded PDF
          </a>
        ) : (
          <span className="text-xs text-slate-500">No PDF yet.</span>
        )}
        <label className={`${ghost} w-fit`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {value ? "Replace PDF" : "Upload PDF"}
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-1">PDF only, up to 10 MB. Anyone can download it.</p>
    </div>
  );
}

/** Text input bound to a string field, with an optional number keyboard. */
export function Field({
  id,
  title,
  value,
  onChange,
  max,
  numeric = false,
  placeholder,
  required = false,
}: {
  id: string;
  title: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  numeric?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>{title}{required ? " *" : ""}</label>
      <input
        id={id}
        className={input}
        value={value}
        maxLength={max}
        inputMode={numeric ? "numeric" : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
