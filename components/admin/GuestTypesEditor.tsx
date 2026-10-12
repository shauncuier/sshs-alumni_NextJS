"use client";

import { Plus, Trash2 } from "lucide-react";
import type { GuestTypeDef } from "@/lib/events/types";

const field = "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none";

/** Guests a member can add to a registration (e.g. Spouse ৳700, Child ৳500), each with a price and a limit. */
export default function GuestTypesEditor({ value, onChange }: { value: GuestTypeDef[]; onChange: (next: GuestTypeDef[]) => void }) {
  const update = (i: number, patch: Partial<GuestTypeDef>) => onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 text-xs">
      <div>
        <p className="font-bold text-slate-900">Guests a member can bring</p>
        <p className="text-[11px] text-slate-500">
          Each guest pays this price on top of the member&apos;s fee. &quot;Up to&quot; limits how many one registration may add (1 for a spouse).
        </p>
      </div>

      {value.length === 0 && <p className="text-slate-500">No guests: members register only themselves.</p>}

      {value.map((g, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_4.5rem_auto] gap-2 items-end">
          <div>
            <label htmlFor={`gt-name-${i}`} className="block font-semibold text-slate-600 mb-1">Guest</label>
            <input id={`gt-name-${i}`} className={field} value={g.name} maxLength={60} placeholder="Spouse" onChange={(e) => update(i, { name: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`gt-price-${i}`} className="block font-semibold text-slate-600 mb-1">Price (৳)</label>
            <input id={`gt-price-${i}`} type="number" min={0} className={field} value={g.price} onChange={(e) => update(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div>
            <label htmlFor={`gt-max-${i}`} className="block font-semibold text-slate-600 mb-1">Up to</label>
            <input id={`gt-max-${i}`} type="number" min={1} max={20} className={field} value={g.max} onChange={(e) => update(i, { max: Math.min(20, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })} />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remove ${g.name || "guest type"}`}
            className="p-2 mb-0.5 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, { name: "", price: 0, max: 1 }])}
        className="px-3 py-2 rounded-xl border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add guest type
      </button>
    </div>
  );
}
