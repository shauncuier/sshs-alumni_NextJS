"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { computeFee, formatTaka, normalizePackages } from "@/lib/events/pricing";
import type { MemberRegistration, PublicEvent } from "@/lib/events/types";

const FIRST_SSC_BATCH = 1985;
const BATCH_YEARS = Array.from({ length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 }, (_, i) => new Date().getFullYear() - i);
const PAYMENT_METHODS = ["bKash", "Nagad", "Bank", "Cash"];
const input = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600";
const label = "block text-xs font-semibold text-slate-700 mb-1";

/**
 * One form for joining (membership event, signed out: account + registration) and
 * for registering signed-in members. The live total uses the same rules as the server,
 * which recalculates it and is the only source of truth.
 */
export default function RegistrationForm({
  event,
  initialPackage,
  onRegistered,
}: {
  event: PublicEvent;
  initialPackage?: string;
  onRegistered: (registration: MemberRegistration) => void;
}) {
  const { status: sessionStatus } = useSession();
  const needsAccount = sessionStatus === "unauthenticated" && event.isMembershipEvent;
  // Step 1 (account details) only exists for signed-out visitors joining. The session
  // is still "loading" on the first render, so derive what to show on every render.
  const [step, setStep] = useState<1 | 2>(1);
  const showAccount = needsAccount && step === 1;
  const showRegistration = !needsAccount || step === 2;

  const [account, setAccount] = useState({ fullName: "", email: "", phone: "", password: "", sscBatch: "2010", rollNumber: "", section: "" });
  const [packageName, setPackageName] = useState(initialPackage ?? event.packages[0]?.name ?? "");
  const [extraAdults, setExtraAdults] = useState(0);
  const [extraChildren, setExtraChildren] = useState(0);
  const [tshirtSize, setTshirtSize] = useState("L");
  const [mealPreference, setMealPreference] = useState("");
  const [donation, setDonation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (sessionStatus === "loading") {
    return <p role="status" className="text-xs text-slate-500">Loading…</p>;
  }
  if (sessionStatus === "unauthenticated" && !event.isMembershipEvent) {
    return (
      <p className="text-xs text-slate-600">
        This event is for verified members. <Link href={`/login?callbackUrl=/events/${event.slug}`} className="font-bold text-emerald-800 underline">Sign in</Link> or{" "}
        <Link href="/register" className="font-bold text-emerald-800 underline">join the association</Link>.
      </p>
    );
  }
  if (!event.isRegistrationOpen) {
    return <p role="status" className="text-xs font-bold text-rose-700">{event.closedMessage}</p>;
  }

  let total: { fee: number; donation: number; total: number; headCount: number } | null = null;
  try {
    total = computeFee(
      { registrationFee: event.registrationFeeAmount, extraAdultFee: event.extraAdultFee, childFee: event.childFee, packages: normalizePackages(event.packages.map((p) => ({ ...p, price: p.priceAmount }))) },
      { packageName, extraAdults, extraChildren, donationAmount: donation ? Number(donation) : 0 }
    );
  } catch {
    total = null;
  }
  const paid = (total?.total ?? 0) > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: needsAccount ? { ...account, sscBatch: Number(account.sscBatch) } : undefined,
          rsvp: {
            packageName: event.packages.length ? packageName : null,
            extraAdults,
            extraChildren,
            tshirtSize,
            mealPreference: mealPreference || null,
            donationAmount: donation ? Number(donation) : 0,
            paymentMethod: paid ? paymentMethod : null,
            transactionId: paid ? transactionId : null,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.code === "EMAIL_EXISTS") setExistingAccount(true);
        throw new Error(body.error || "Registration failed. Please try again.");
      }
      if (body.createdAccount) {
        // Sign the new member in with the password they just chose.
        await signIn("credentials", { redirect: false, email: body.createdAccount.email, password: account.password });
      }
      onRegistered(body.registration);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {needsAccount && (
        <div className="flex gap-2 text-[11px] font-bold">
          <span className={step === 1 ? "text-emerald-800" : "text-slate-400"}>1. Your details</span>
          <span className="text-slate-300">/</span>
          <span className={step === 2 ? "text-emerald-800" : "text-slate-400"}>2. Registration &amp; payment</span>
        </div>
      )}

      {showAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="reg-name" className={label}>Full name *</label>
            <input id="reg-name" required className={input} value={account.fullName} onChange={(e) => setAccount({ ...account, fullName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-email" className={label}>Email *</label>
            <input id="reg-email" type="email" required className={input} value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-phone" className={label}>Phone *</label>
            <input id="reg-phone" required className={input} value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-password" className={label}>Password (8+ characters) *</label>
            <input id="reg-password" type="password" minLength={8} required autoComplete="new-password" className={input} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-batch" className={label}>SSC batch *</label>
            <select id="reg-batch" className={input} value={account.sscBatch} onChange={(e) => setAccount({ ...account, sscBatch: e.target.value })}>
              {BATCH_YEARS.map((y) => <option key={y} value={y}>SSC Batch {y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reg-roll" className={label}>Roll number</label>
            <input id="reg-roll" className={input} value={account.rollNumber} onChange={(e) => setAccount({ ...account, rollNumber: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-section" className={label}>Section</label>
            <select id="reg-section" className={input} value={account.section} onChange={(e) => setAccount({ ...account, section: e.target.value })}>
              <option value="">—</option>
              <option value="A">Section A (Morning)</option>
              <option value="B">Section B (Day)</option>
              <option value="Science">Science Cohort</option>
              <option value="Commerce">Commerce / Arts</option>
            </select>
          </div>
          <button
            type="button"
            className="sm:col-span-2 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).form!;
              if (form.reportValidity()) setStep(2);
            }}
          >
            Continue to registration &amp; payment
          </button>
        </div>
      )}

      {showRegistration && (
        <div className="space-y-3">
          {event.packages.length > 0 && (
            <div>
              <label htmlFor="reg-package" className={label}>Package *</label>
              <select id="reg-package" className={input} value={packageName} onChange={(e) => setPackageName(e.target.value)}>
                {event.packages.map((p) => <option key={p.name} value={p.name}>{p.name} — {p.price}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-adults" className={label}>Extra adults{event.extraAdultFee ? ` (+${formatTaka(event.extraAdultFee)} each)` : ""}</label>
              <input id="reg-adults" type="number" min={0} max={10} className={input} value={extraAdults} onChange={(e) => setExtraAdults(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
            </div>
            <div>
              <label htmlFor="reg-children" className={label}>Children under 12{event.childFee ? ` (+${formatTaka(event.childFee)} each)` : ""}</label>
              <input id="reg-children" type="number" min={0} max={10} className={input} value={extraChildren} onChange={(e) => setExtraChildren(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
            </div>
            <div>
              <label htmlFor="reg-tshirt" className={label}>T-shirt size</label>
              <select id="reg-tshirt" className={input} value={tshirtSize} onChange={(e) => setTshirtSize(e.target.value)}>
                {["S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="reg-meal" className={label}>Meal preference</label>
              <input id="reg-meal" className={input} value={mealPreference} onChange={(e) => setMealPreference(e.target.value)} placeholder="e.g. Vegetarian" />
            </div>
          </div>
          <div>
            <label htmlFor="reg-donation" className={label}>Additional donation (optional, ৳)</label>
            <input id="reg-donation" type="number" min={0} step={1} className={input} value={donation} onChange={(e) => setDonation(e.target.value)} placeholder="Any amount you'd like to give" />
          </div>

          {total && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between"><span>Registration</span><strong>{formatTaka(total.fee)}</strong></div>
              {total.donation > 0 && <div className="flex justify-between"><span>Donation</span><strong>{formatTaka(total.donation)}</strong></div>}
              <div className="flex justify-between text-sm"><span className="font-bold">Total to pay</span><strong>{formatTaka(total.total)}</strong></div>
              <div className="text-slate-500">{total.headCount} {total.headCount === 1 ? "person" : "people"}</div>
            </div>
          )}

          {paid && (
            <div className="space-y-3">
              <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 whitespace-pre-line">{event.paymentInstructions}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-method" className={label}>Paid with *</label>
                  <select id="reg-method" className={input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-trx" className={label}>Transaction ID *</label>
                  <input id="reg-trx" required className={input} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. 9AB3XK1LQ" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs font-bold text-rose-700">
              {error}{" "}
              {existingAccount && <Link href={`/login?callbackUrl=/events/${event.slug}`} className="underline">Sign in</Link>}
            </p>
          )}

          <div className="flex gap-2">
            {needsAccount && (
              <button type="button" onClick={() => setStep(1)} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Back</button>
            )}
            <button type="submit" disabled={submitting || !total} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50">
              {submitting ? "Submitting…" : event.isMembershipEvent && needsAccount ? "Join & register" : "Register"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
