"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Clock, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  bannerImage: string | null;
  isActive: boolean;
  status: "OPEN" | "CLOSED" | "ENDED" | "UPCOMING";
  startDate: string;
  endDate: string | null;
  daysLeft: number | null;
  donationsCount: number;
}

interface Category {
  value: string;
  label: string;
}

const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1.5";
const primary = "px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const ghost = "px-3 py-2 min-h-[40px] border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer";
const thumb = (url: string | null) => (url ? url.replace("/large.webp", "/thumb.webp") : null);

const STATUS: Record<Campaign["status"], { text: string; cls: string }> = {
  OPEN: { text: "Open", cls: "bg-emerald-100 text-emerald-800" },
  UPCOMING: { text: "Starts later", cls: "bg-sky-100 text-sky-800" },
  ENDED: { text: "Ended", cls: "bg-slate-200 text-slate-700" },
  CLOSED: { text: "Closed", cls: "bg-slate-200 text-slate-700" },
};

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const today = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);
const EMPTY = { title: "", category: "SCHOLARSHIP", description: "", goalAmount: "", bannerImage: null as string | null, startDate: "", endDate: "" };
type Form = typeof EMPTY;

function BannerField({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/admin/media", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-20 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
        {value ? <img loading="lazy" decoding="async" src={thumb(value)!} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
      </div>
      <div className="space-y-1.5">
        <label className={`${ghost} w-fit`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {value ? "Replace" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
        </label>
        {value && <button type="button" onClick={() => onChange(null)} className="text-[11px] font-bold text-rose-700 cursor-pointer">Remove</button>}
        {error && <p className="text-[11px] font-bold text-rose-700">{error}</p>}
      </div>
    </div>
  );
}

function CampaignForm({ campaign, categories, onClose, onSaved }: { campaign: Campaign | null; categories: Category[]; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<Form>(() =>
    campaign
      ? { title: campaign.title, category: campaign.category, description: campaign.description, goalAmount: String(campaign.goalAmount), bannerImage: campaign.bannerImage, startDate: campaign.startDate, endDate: campaign.endDate ?? "" }
      : { ...EMPTY, startDate: today() }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, goalAmount: Number(form.goalAmount) };
      if (campaign) await api(`/api/admin/campaigns/${campaign.id}`, "PATCH", body);
      else await api("/api/admin/campaigns", "POST", body);
      onSaved(campaign ? `Saved "${form.title}".` : `Campaign "${form.title}" is created.`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={campaign ? "Edit campaign" : "New campaign"}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{campaign ? "Edit campaign" : "New fundraising campaign"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -m-2 text-slate-400 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div>
          <label htmlFor="cp-title" className={label}>Title</label>
          <input id="cp-title" className={input} value={form.title} maxLength={150} onChange={(e) => set("title", e.target.value)} placeholder="Needy student scholarship 2027" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cp-cat" className={label}>Category</label>
            <select id="cp-cat" className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cp-goal" className={label}>Goal (৳)</label>
            <input id="cp-goal" inputMode="numeric" className={input} value={form.goalAmount} onChange={(e) => set("goalAmount", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="500000" required />
          </div>
          <div>
            <label htmlFor="cp-start" className={label}>Start date</label>
            <input id="cp-start" type="date" className={input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <label htmlFor="cp-end" className={label}>End date <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="cp-end" type="date" className={input} value={form.endDate} min={form.startDate || undefined} onChange={(e) => set("endDate", e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="cp-desc" className={label}>What the money is for</label>
          <textarea id="cp-desc" rows={5} className={input} value={form.description} maxLength={5000} onChange={(e) => set("description", e.target.value)} required />
        </div>
        <div>
          <span className={label}>Banner image <span className="font-normal text-slate-400">(optional)</span></span>
          <BannerField value={form.bannerImage} onChange={(url) => set("bannerImage", url)} />
        </div>

        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghost}>Cancel</button>
          <button type="submit" disabled={saving} className={primary}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {campaign ? "Save" : "Create campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Create, edit, close, reopen and delete fundraising campaigns. */
export default function CampaignManager({ onChanged }: { onChanged?: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/admin/campaigns", "GET");
      setCampaigns(data.campaigns);
      setCategories(data.categories);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const changed = async (message: string) => {
    setNotice(message);
    setError(null);
    await load();
    onChanged?.();
  };

  const act = async (c: Campaign, action: "close" | "reopen" | "delete") => {
    const question = {
      close: `Close "${c.title}"? It disappears from the donate page and takes no new donations. You can reopen it later.`,
      reopen: `Reopen "${c.title}" for donations?`,
      delete: `Delete "${c.title}"? This cannot be undone.`,
    }[action];
    if (!window.confirm(question)) return;
    setBusyId(c.id);
    setNotice(null);
    try {
      if (action === "delete") await api(`/api/admin/campaigns/${c.id}`, "DELETE");
      else await api(`/api/admin/campaigns/${c.id}`, "PATCH", { isActive: action === "reopen" });
      await changed(action === "delete" ? `Deleted "${c.title}".` : action === "close" ? `Closed "${c.title}".` : `Reopened "${c.title}".`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Fundraising campaigns</h2>
        <button type="button" onClick={() => setEditing("new")} disabled={categories.length === 0} className={primary}>
          <Plus className="w-4 h-4" /> New campaign
        </button>
      </div>

      {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
      {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">{notice}</p>}

      {loaded && campaigns.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-1">
          <p className="text-sm font-semibold">No fundraising campaigns yet.</p>
          <p className="text-xs text-slate-400">Create one and it appears on the donate page while it is open.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((c) => {
          const pct = c.goalAmount > 0 ? Math.min((c.raisedAmount / c.goalAmount) * 100, 100) : 0;
          const status = STATUS[c.status];
          return (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{c.categoryLabel}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.text}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5">{c.title}</h3>
                </div>
                {c.bannerImage && <img loading="lazy" decoding="async" src={thumb(c.bannerImage)!} alt="" className="w-20 h-14 rounded-lg object-cover border border-slate-100 shrink-0" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700">Raised: ৳{c.raisedAmount.toLocaleString()}</span>
                  <span className="text-slate-500">Goal: ৳{c.goalAmount.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{pct.toFixed(1)}% funded · {c.donorCount} verified donor{c.donorCount === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {c.endDate ? (c.status === "OPEN" ? `${c.daysLeft} days left` : `ends ${c.endDate}`) : "no end date"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(c)} disabled={busyId !== null} className={ghost}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                {c.isActive ? (
                  <button type="button" onClick={() => void act(c, "close")} disabled={busyId !== null} className={ghost}>Close</button>
                ) : (
                  <button type="button" onClick={() => void act(c, "reopen")} disabled={busyId !== null} className={ghost}>Reopen</button>
                )}
                {c.donationsCount === 0 && (
                  <button type="button" onClick={() => void act(c, "delete")} disabled={busyId !== null} className={`${ghost} text-rose-700 border-rose-200 hover:bg-rose-50`}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <CampaignForm
          campaign={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            void changed(message);
          }}
        />
      )}
    </div>
  );
}
