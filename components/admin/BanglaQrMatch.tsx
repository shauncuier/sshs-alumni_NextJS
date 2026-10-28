"use client";

import React, { useState } from "react";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { checkSms, matchLine, parseWalletSms, type SmsCheck } from "@/lib/payments/bangla-qr";

/**
 * Matching a Bangla QR payment to the association's OK Wallet SMS. The member's own
 * transaction ID never appears in that SMS, so the admin looks for the amount, the
 * last 4 digits and the time, pastes the SMS, and the SMS TrxID is recorded with the
 * confirmation (one SMS confirms one payment).
 */
export default function BanglaQrMatch({
  amount,
  last4,
  paidAt,
  memberTrxId,
  value,
  onChange,
  idPrefix = "bqr",
}: {
  amount: number;
  last4: string | null;
  paidAt: string | null;
  memberTrxId: string | null;
  value: string;
  onChange: (merchantTrxId: string) => void;
  idPrefix?: string;
}) {
  const [sms, setSms] = useState("");
  const [check, setCheck] = useState<SmsCheck | null>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const readSms = (text: string) => {
    setSms(text);
    setSmsError(null);
    if (!text.trim()) {
      setCheck(null);
      return;
    }
    const parsed = parseWalletSms(text);
    if (!parsed.trxId) {
      setCheck(null);
      setSmsError("No TrxID found in this text. Paste the whole OK Wallet SMS.");
      return;
    }
    onChange(parsed.trxId);
    setCheck(checkSms(parsed, { amount, last4, paidAt }));
  };

  const tick = (ok: boolean | null, label: string) => (
    <span className={`inline-flex items-center gap-1 ${ok === true ? "text-emerald-700" : ok === false ? "text-rose-700" : "text-slate-500"}`}>
      {ok === true ? <CheckCircle2 className="w-3.5 h-3.5" /> : ok === false ? <XCircle className="w-3.5 h-3.5" /> : <CircleHelp className="w-3.5 h-3.5" />}
      {label}
    </span>
  );

  return (
    <div className="space-y-2.5 rounded-xl border border-[#006a4e]/30 bg-emerald-50/60 p-3 text-xs">
      <div>
        <p className="font-bold text-[#006a4e]">Find this payment in the OK Wallet SMS</p>
        <p className="font-mono text-slate-900 mt-0.5">{matchLine({ amount, last4, paidAt })}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          The member&apos;s own app ID ({memberTrxId ?? "none"}) never appears in our SMS; match by amount, last 4 digits and time.
          {!last4 && " This member gave no last 4 digits (an older registration): match by amount and time, and check the screenshot."}
        </p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-sms`} className="block text-[11px] font-semibold text-slate-700 mb-1">Paste the SMS (optional, fills in the TrxID)</label>
        <textarea
          id={`${idPrefix}-sms`}
          rows={3}
          value={sms}
          onChange={(e) => readSms(e.target.value)}
          placeholder="(OK Wallet) Payment received TK 1250 from BANQR A/C 0182***5517 is successful. … TrxID 72610280154891 at 28/10/26 23:29"
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        {smsError && <p role="alert" className="text-[11px] font-bold text-rose-700 mt-1">{smsError}</p>}
        {check && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold">
            {tick(check.amount, "Amount")}
            {tick(check.last4, "Last 4 digits")}
            {tick(check.time, "Time")}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-trx`} className="block text-[11px] font-semibold text-slate-700 mb-1">TrxID from our SMS *</label>
        <input
          id={`${idPrefix}-trx`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, "").toUpperCase())}
          placeholder="e.g. 72610280154891"
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>
    </div>
  );
}
