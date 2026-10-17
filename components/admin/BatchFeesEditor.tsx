"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BatchFeeDef } from "@/lib/events/types";
import { formatTaka } from "@/lib/events/pricing";

const field = "w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none";
const year = (v: string) => Math.floor(Number(v)) || 0;

/** The member's own fee by SSC batch (e.g. 1989–2014 ৳1,500, 2015–2026 ৳1,250). */
export default function BatchFeesEditor({
  value,
  mainFee,
  onChange,
}: {
  value: BatchFeeDef[];
  /** The main registration fee: what batches outside every range pay. */
  mainFee: number;
  onChange: (next: BatchFeeDef[]) => void;
}) {
  const update = (i: number, patch: Partial<BatchFeeDef>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const thisYear = new Date().getFullYear();

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 text-xs">
      <div>
        <p className="font-bold text-slate-900">Member fee by SSC batch</p>
        <p className="text-[11px] text-slate-500">
          Different fees for older and younger batches. A batch outside every range pays the main fee ({formatTaka(mainFee)}). Ranges must not overlap.
        </p>
      </div>

      {value.length === 0 && <p className="text-slate-500">Every batch pays the main fee.</p>}

      {value.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_6rem_auto] gap-2 items-end">
          <div>
            <label htmlFor={`bf-from-${i}`} className="block font-semibold text-slate-600 mb-1">From batch</label>
            <input id={`bf-from-${i}`} type="number" min={1950} max={thisYear} className={field} value={r.fromBatch || ""} placeholder="1989" onChange={(e) => update(i, { fromBatch: year(e.target.value) })} />
          </div>
          <div>
            <label htmlFor={`bf-to-${i}`} className="block font-semibold text-slate-600 mb-1">To batch</label>
            <input id={`bf-to-${i}`} type="number" min={1950} max={thisYear + 1} className={field} value={r.toBatch || ""} placeholder="2014" onChange={(e) => update(i, { toBatch: year(e.target.value) })} />
          </div>
          <div>
            <label htmlFor={`bf-price-${i}`} className="block font-semibold text-slate-600 mb-1">Fee (৳)</label>
            <input id={`bf-price-${i}`} type="number" min={0} className={field} value={r.price} onChange={(e) => update(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remove batches ${r.fromBatch}–${r.toBatch}`}
            className="p-2 mb-0.5 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, { fromBatch: 0, toBatch: 0, price: mainFee }])}
        className="px-3 py-2 rounded-xl border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add batch range
      </button>
    </div>
  );
}
