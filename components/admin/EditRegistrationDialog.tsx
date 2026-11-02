"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/admin/content-kit";
import { computeFee, formatTaka, isChildGuestType, normalizePackages, MAX_CHILD_GUEST_AGE } from "@/lib/events/pricing";
import type { AdminRegistration, PublicEvent } from "@/lib/events/types";

type Person = { name: string; age: string };

const input = "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none";
const label = "block text-xs font-semibold text-slate-700 mb-1";

/**
 * The super admin corrects a registration the member filled in wrongly: package, guests
 * and the amount paid. Saved by PUT /api/admin/events/[id]/registrations/[regId].
 */
export default function EditRegistrationDialog({
  eventId,
  registrationId,
  onSaved,
  onClose,
}: {
  eventId: string;
  registrationId: string;
  onSaved: (registration: AdminRegistration) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ registration: AdminRegistration; event: PublicEvent } | null>(null);
  const [pkg, setPkg] = useState("");
  const [guests, setGuests] = useState<Record<string, number>>({});
  const [people, setPeople] = useState<Record<string, Person[]>>({});
  const [amount, setAmount] = useState("");
  const [overridden, setOverridden] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/registrations/${registrationId}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load the registration.");
        const reg: AdminRegistration = body.registration;
        setData(body);
        setPkg(reg.packageName ?? "");
        setGuests(Object.fromEntries(reg.guests.map((g) => [g.name, g.count])));
        setPeople(Object.fromEntries(reg.guests.map((g) => [g.name, (g.people ?? []).map((p) => ({ name: p.name, age: p.age == null ? "" : String(p.age) }))])));
        setAmount(String(reg.totalFee));
      })
      .catch((err: Error) => setError(err.message));
  }, [eventId, registrationId]);

  if (!data) {
    return (
      <Dialog title="Edit registration" onClose={onClose}>
        {error ? <p role="alert" className="text-sm font-bold text-rose-700">{error}</p> : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
      </Dialog>
    );
  }

  const { registration: reg, event } = data;
  let price: { fee: number; headCount: number } | null = null;
  let priceError: string | null = null;
  try {
    price = computeFee(
      {
        registrationFee: event.registrationFeeAmount,
        extraAdultFee: event.extraAdultFee,
        childFee: event.childFee,
        packages: normalizePackages(event.packages.map((p) => ({ ...p, price: p.priceAmount }))),
        guestTypes: event.customGuestTypes ? event.guestTypes : [],
        batchFees: event.batchFees,
      },
      { packageName: pkg || null, guests },
      { sscBatch: reg.batch }
    );
  } catch (err) {
    priceError = (err as Error).message;
  }
  const fee = overridden ? Number(amount) : (price?.fee ?? reg.totalFee);
  const paid = reg.status === "CONFIRMED" || reg.status === "CHECKED_IN";

  const setCount = (name: string, count: number) => setGuests((g) => ({ ...g, [name]: count }));
  const setPerson = (name: string, i: number, patch: Partial<Person>) =>
    setPeople((all) => {
      const list = [...(all[name] ?? [])];
      list[i] = { ...(list[i] ?? { name: "", age: "" }), ...patch };
      return { ...all, [name]: list };
    });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const guestPeople = Object.fromEntries(
        Object.entries(people).map(([name, list]) => [name, list.slice(0, guests[name] ?? 0).map((p) => ({ name: p?.name ?? "", age: p?.age ?? "" }))])
      );
      const res = await fetch(`/api/admin/events/${eventId}/registrations/${registrationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageName: pkg || null, guests, guestPeople, amountOverride: overridden ? amount : null, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save the registration.");
      onSaved(body.registration);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Edit registration: ${reg.name}`} onClose={onClose}>
      <p className="text-xs text-slate-600">
        Now: {reg.packageName ?? "Member"} · {reg.headCount} {reg.headCount === 1 ? "person" : "people"} · {formatTaka(reg.totalFee)}
        {reg.paymentMethod ? ` · ${reg.paymentMethod}` : ""}
      </p>

      {event.packages.length > 0 && (
        <div>
          <label htmlFor="edit-reg-pkg" className={label}>Package</label>
          <select id="edit-reg-pkg" className={input} value={pkg} onChange={(e) => setPkg(e.target.value)}>
            <option value="">Choose a package</option>
            {event.packages.map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.price})</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {event.guestTypes.map((g) => {
          const count = guests[g.name] ?? 0;
          const child = isChildGuestType(g.name);
          return (
            <div key={g.name} className="p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-3">
                <label htmlFor={`edit-reg-g-${g.name}`} className="flex-1 text-sm font-bold text-slate-800">
                  {g.name} <span className="font-normal text-slate-500">({formatTaka(g.price)} each)</span>
                </label>
                <input
                  id={`edit-reg-g-${g.name}`}
                  type="number"
                  min={0}
                  max={g.max}
                  className={`${input} w-20`}
                  value={count}
                  onChange={(e) => setCount(g.name, Math.max(0, Math.min(g.max, Math.floor(Number(e.target.value) || 0))))}
                />
              </div>
              {Array.from({ length: count }, (_, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    aria-label={`${g.name} ${i + 1} name`}
                    placeholder={`${g.name} ${i + 1} name (optional)`}
                    className={input}
                    value={people[g.name]?.[i]?.name ?? ""}
                    onChange={(e) => setPerson(g.name, i, { name: e.target.value })}
                  />
                  {child && (
                    <input
                      aria-label={`${g.name} ${i + 1} age`}
                      placeholder="Age"
                      type="number"
                      min={0}
                      max={MAX_CHILD_GUEST_AGE}
                      className={`${input} w-20`}
                      value={people[g.name]?.[i]?.age ?? ""}
                      onChange={(e) => setPerson(g.name, i, { age: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-slate-800">
        {price ? (
          <>Price from the event: <b>{formatTaka(price.fee)}</b> · <b>{price.headCount}</b> {price.headCount === 1 ? "person" : "people"}</>
        ) : (
          <span className="text-rose-700">{priceError}</span>
        )}
      </p>

      <div>
        <label htmlFor="edit-reg-amount" className={label}>Amount paid (৳)</label>
        <input
          id="edit-reg-amount"
          type="number"
          min={0}
          className={input}
          value={overridden ? amount : String(price?.fee ?? reg.totalFee)}
          onChange={(e) => {
            setOverridden(true);
            setAmount(e.target.value);
          }}
        />
        {overridden && (
          <button type="button" onClick={() => setOverridden(false)} className="mt-1 text-xs font-bold text-emerald-800 underline cursor-pointer">
            Use the event price
          </button>
        )}
      </div>

      <div>
        <label htmlFor="edit-reg-note" className={label}>Why (kept in the activity log)</label>
        <input id="edit-reg-note" className={input} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid ৳3,300 for 4 people, chose 1 by mistake" />
      </div>

      {paid && (
        <p className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {fee !== reg.totalFee
            ? `The payment is confirmed: the accounts will be corrected (the ${formatTaka(reg.totalFee)} income is voided and ${formatTaka(fee || 0)} posted). `
            : "The payment is confirmed. "}
          Food tokens follow the new head count; reprint the slip and tokens.
        </p>
      )}

      {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-bold cursor-pointer">Cancel</button>
        <button
          type="button"
          disabled={saving || (!price && !overridden)}
          onClick={() => void save()}
          className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Dialog>
  );
}
