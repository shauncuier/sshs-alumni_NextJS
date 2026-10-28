"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Printer, UtensilsCrossed } from "lucide-react";
import type { PublicEvent } from "@/lib/events/types";
import { computeFee, formatTaka, normalizePackages } from "@/lib/events/pricing";
import { FIRST_SSC_BATCH } from "@/lib/data";
import { BLOOD_GROUPS } from "@/lib/members/blood-groups";
import { PROOF_TYPES } from "@/lib/members/proof-types";

const BATCH_YEARS = Array.from({ length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 }, (_, i) => new Date().getFullYear() - i);
const input = "w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none";
const label = "block text-xs font-semibold text-slate-700 mb-1";
const card = "bg-white p-5 rounded-2xl border border-slate-200 space-y-4";

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  sscBatch: "",
  rollNumber: "",
  section: "",
  bloodGroup: "",
  profession: "",
  designation: "",
  company: "",
  address: "",
};

/**
 * The paper registration form, typed in by the committee. Same fields as the
 * printed form (design/offline-form); saved by POST /api/admin/events/[id]/offline-entry.
 */
export default function OfflineEntryForm({ event }: { event: PublicEvent }) {
  const [member, setMember] = useState(EMPTY);
  const [formNo, setFormNo] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [proofType, setProofType] = useState("");
  const [guests, setGuests] = useState<Record<string, number>>({});
  const [tshirtSize, setTshirtSize] = useState("L");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Bangla QR">("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ registrationId: string; name: string; totalFee: number; email: string } | null>(null);

  const set = (patch: Partial<typeof EMPTY>) => setMember((m) => ({ ...m, ...patch }));

  let total: number | null = null;
  try {
    total = member.sscBatch
      ? computeFee(
          {
            registrationFee: event.registrationFeeAmount,
            extraAdultFee: event.extraAdultFee,
            childFee: event.childFee,
            packages: normalizePackages(event.packages.map((p) => ({ ...p, price: p.priceAmount }))),
            guestTypes: event.customGuestTypes ? event.guestTypes : [],
            batchFees: event.batchFees,
          },
          { guests },
          { sscBatch: Number(member.sscBatch) }
        ).total
      : null;
  } catch {
    total = null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!proofType) return setError("Tick the document you checked on the paper form.");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append(
        "payload",
        JSON.stringify({ member, proofType, guests, tshirtSize, paymentMethod, transactionId: paymentMethod === "Bangla QR" ? transactionId : null, formNo, receiptNo })
      );
      if (photo) fd.append("photo", photo);
      const res = await fetch(`/api/admin/events/${event.id}/offline-entry`, { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save the form.");
      setDone({ registrationId: body.registrationId, name: member.fullName, totalFee: body.totalFee, email: body.email });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setMember(EMPTY);
    setFormNo("");
    setReceiptNo("");
    setProofType("");
    setGuests({});
    setTshirtSize("L");
    setPaymentMethod("Cash");
    setTransactionId("");
    setPhoto(null);
    setPhotoKey((k) => k + 1);
    setDone(null);
    setError(null);
  };

  if (done) {
    return (
      <div className={`${card} text-center`} role="status">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h2 className="text-lg font-black text-slate-900">{done.name} is registered and approved</h2>
        <p className="text-sm text-slate-600">
          {formatTaka(done.totalFee)} received. The confirmation SMS has gone to their mobile
          {done.email.endsWith(".invalid") ? " (no email on the form)." : " and an email to " + done.email + "."}
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <a href={`/print/event/${event.id}?what=slips&reg=${done.registrationId}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print payment slip
          </a>
          <a href={`/print/event/${event.id}?what=tokens&reg=${done.registrationId}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold flex items-center gap-1.5">
            <UtensilsCrossed className="w-4 h-4" /> Print food tokens
          </a>
          <button type="button" onClick={reset} className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer">
            Enter the next form
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className={card}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="off-formno" className={label}>Form no. (office box)</label>
            <input id="off-formno" maxLength={30} className={input} value={formNo} onChange={(e) => setFormNo(e.target.value)} />
          </div>
          <div>
            <label htmlFor="off-receipt" className={label}>Receipt no.</label>
            <input id="off-receipt" maxLength={30} className={input} value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold text-slate-900">১ · Personal details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="off-name" className={label}>Full name (in English) *</label>
            <input id="off-name" required maxLength={120} className={input} value={member.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-phone" className={label}>Mobile number *</label>
            <input id="off-phone" required inputMode="tel" placeholder="01XXXXXXXXX" className={input} value={member.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-email" className={label}>Email <span className="font-normal text-slate-400">(if written)</span></label>
            <input id="off-email" type="email" maxLength={191} className={input} value={member.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-batch" className={label}>SSC batch *</label>
            <select id="off-batch" required className={input} value={member.sscBatch} onChange={(e) => set({ sscBatch: e.target.value })}>
              <option value="" disabled>Choose the batch</option>
              {BATCH_YEARS.map((y) => <option key={y} value={y}>SSC {y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="off-roll" className={label}>Roll</label>
            <input id="off-roll" maxLength={20} className={input} value={member.rollNumber} onChange={(e) => set({ rollNumber: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-group" className={label}>Group (বিভাগ)</label>
            <select id="off-group" className={input} value={member.section} onChange={(e) => set({ section: e.target.value })}>
              <option value="">Not ticked</option>
              <option value="Science">Science</option>
              <option value="Business Studies">Business Studies</option>
              <option value="Humanities">Humanities</option>
            </select>
          </div>
          <div>
            <label htmlFor="off-blood" className={label}>Blood group</label>
            <select id="off-blood" className={input} value={member.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })}>
              <option value="">Not given</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="off-profession" className={label}>Profession (পেশা)</label>
            <input id="off-profession" maxLength={100} className={input} value={member.profession} onChange={(e) => set({ profession: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-designation" className={label}>Designation (পদবী)</label>
            <input id="off-designation" maxLength={100} className={input} value={member.designation} onChange={(e) => set({ designation: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-company" className={label}>Company (কোম্পানি)</label>
            <input id="off-company" maxLength={150} className={input} value={member.company} onChange={(e) => set({ company: e.target.value })} />
          </div>
          <div>
            <label htmlFor="off-address" className={label}>Address (ঠিকানা)</label>
            <input id="off-address" maxLength={255} className={input} value={member.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="off-photo" className={label}>Photo <span className="font-normal text-slate-400">(optional: a phone photo of the pasted picture)</span></label>
            <input
              key={photoKey}
              id="off-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-bold"
            />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold text-slate-900">২ · Fee</h2>
        <div className="grid grid-cols-2 gap-3">
          {event.guestTypes.map((g, i) => (
            <div key={g.name}>
              <label htmlFor={`off-guest-${i}`} className={label}>
                {g.name}
                {g.price > 0 ? ` (+${formatTaka(g.price)} each)` : ""}
              </label>
              <input
                id={`off-guest-${i}`}
                type="number"
                min={0}
                max={g.max}
                className={input}
                value={guests[g.name] ?? 0}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(g.max, Math.floor(Number(e.target.value)) || 0));
                  setGuests((c) => ({ ...c, [g.name]: n }));
                }}
              />
            </div>
          ))}
          <div>
            <label htmlFor="off-tshirt" className={label}>T-shirt size</label>
            <select id="off-tshirt" className={input} value={tshirtSize} onChange={(e) => setTshirtSize(e.target.value)}>
              {["S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-900">
          Total: {total === null ? <span className="font-normal text-slate-500">choose the batch</span> : formatTaka(total)}
        </p>
      </section>

      <section className={card}>
        <h2 className="font-bold text-slate-900">৩ · Payment</h2>
        <div className="flex flex-wrap gap-4">
          {(["Cash", "Bangla QR"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="off-method" className="w-4 h-4 accent-emerald-700" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
              {m === "Cash" ? "Cash (নগদ)" : "Bangla QR"}
            </label>
          ))}
        </div>
        {paymentMethod === "Bangla QR" && (
          <div>
            <label htmlFor="off-trx" className={label}>TrxID from our OK Wallet SMS *</label>
            <input id="off-trx" required maxLength={40} className={`${input} uppercase`} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-bold text-slate-900">৪ · Proof checked *</h2>
        <p className="text-xs text-slate-500 -mt-2">Which photocopy is attached to the paper form? No upload needed.</p>
        <div className="flex flex-wrap gap-4">
          {PROOF_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="off-proof" className="w-4 h-4 accent-emerald-700" checked={proofType === t.value} onChange={() => setProofType(t.value)} />
              {t.label}
            </label>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
      <button type="submit" disabled={saving} className="w-full min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving…" : `Register and approve${total !== null ? ` · ${formatTaka(total)} received` : ""}`}
      </button>
    </form>
  );
}
