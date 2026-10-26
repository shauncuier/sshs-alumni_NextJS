import React from "react";
import type { FilledRegistrationForm as Form } from "@/lib/events/registration-forms";
import { PAYMENT_METHODS } from "@/lib/events/types";
import { PROOF_TYPES } from "@/lib/members/proof-types";
import { BLOOD_GROUPS } from "@/lib/members/blood-groups";

/**
 * One registration printed as the paper registration form (design/offline-form), with
 * the member's answers filled in: same sections, ticks and office-use box, one Legal
 * page each. The styles live in FILLED_FORM_CSS, added once by the print page.
 */

export const FILLED_FORM_CSS = `
.rf { width: 194mm; min-height: 336mm; padding: 0; color: #1c2b25; font-size: 9.6pt; font-family: 'Nirmala UI', 'Shonar Bangla', 'Segoe UI', sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.rf .en { color: #5b6b64; font-size: 8pt; }
.rf .head { display: flex; align-items: center; gap: 4mm; border-bottom: 1mm solid #06281e; padding-bottom: 2.5mm; }
.rf .head img { width: 18mm; height: 18mm; object-fit: contain; }
.rf .t1 { font-size: 11.5pt; font-weight: 700; color: #06281e; line-height: 1.2; }
.rf .t2 { font-size: 9pt; color: #374740; }
.rf .t3 { font-size: 8pt; color: #5b6b64; }
.rf .formno { margin-left: auto; text-align: right; font-size: 7.5pt; color: #374740; }
.rf .formno b { display: inline-block; margin-top: 1mm; padding: 1mm 2mm; border: 0.3mm solid #8a9a93; font-size: 9pt; color: #06281e; font-family: ui-monospace, monospace; }
.rf .titlebar { margin-top: 2.5mm; background: #06281e; color: #fff; border-radius: 1.5mm; padding: 2mm 4mm; display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.rf .titlebar .a { font-size: 12.5pt; font-weight: 700; }
.rf .titlebar .b { font-size: 8.5pt; color: #d5e6de; text-align: right; }
.rf .facts { margin-top: 1.5mm; font-size: 8.5pt; color: #374740; display: flex; gap: 6mm; flex-wrap: wrap; }
.rf .facts b { color: #06281e; }
.rf .stamp { display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 700; font-size: 8pt; }
.rf .stamp.ok { background: #d1fae5; color: #065f46; }
.rf .stamp.wait { background: #fef3c7; color: #92400e; }
.rf h2 { margin: 2mm 0 1mm; font-size: 10.5pt; color: #06281e; border-bottom: 0.3mm solid #c9d6d0; padding-bottom: 0.8mm; display: flex; gap: 2mm; align-items: baseline; }
.rf h2 .n { display: inline-flex; width: 5mm; height: 5mm; border-radius: 50%; background: #06281e; color: #fff; font-size: 8pt; align-items: center; justify-content: center; }
.rf h2 .en { font-weight: 400; }
.rf .grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 5mm; }
.rf .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 4mm; }
.rf .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); column-gap: 4mm; }
.rf .field { margin-bottom: 1.2mm; min-width: 0; }
.rf .field .lbl { font-size: 8.8pt; }
.rf .field .val { min-height: 4.8mm; border-bottom: 0.3mm dotted #6f8079; font-weight: 600; color: #0b2a1f; font-size: 9.6pt; overflow-wrap: anywhere; }
.rf .top { display: grid; grid-template-columns: 1fr 30mm; gap: 5mm; align-items: start; }
.rf .photo { border: 0.35mm dashed #6f8079; height: 36mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7.5pt; color: #5b6b64; overflow: hidden; }
.rf .photo img { width: 100%; height: 100%; object-fit: cover; }
.rf .row { display: flex; align-items: center; gap: 2mm; flex-wrap: wrap; margin-bottom: 1.6mm; font-size: 8.8pt; }
.rf .boxes { display: inline-flex; }
.rf .box { display: inline-flex; align-items: center; justify-content: center; width: 5.2mm; height: 6.2mm; border: 0.3mm solid #6f8079; margin-right: -0.3mm; font-weight: 700; font-size: 9.5pt; font-family: ui-monospace, monospace; color: #0b2a1f; }
.rf .chk { display: inline-flex; align-items: center; gap: 1.2mm; margin-right: 3mm; white-space: nowrap; }
.rf .tick { display: inline-flex; align-items: center; justify-content: center; width: 3.6mm; height: 3.6mm; border: 0.3mm solid #4b5b54; border-radius: 0.6mm; font-size: 8pt; line-height: 1; font-weight: 700; }
.rf .tick.on { background: #06281e; color: #fff; border-color: #06281e; }
.rf table.fee { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
.rf table.fee th { background: #e8f1ed; color: #06281e; font-weight: 700; text-align: left; padding: 1.2mm 2mm; border: 0.3mm solid #b9c9c2; }
.rf table.fee td { padding: 0.9mm 2mm; border: 0.3mm solid #b9c9c2; vertical-align: middle; }
.rf table.fee .c { text-align: center; width: 18mm; }
.rf table.fee .r { text-align: right; width: 28mm; font-weight: 600; }
.rf table.fee .total td { font-weight: 700; background: #f6f2e4; }
.rf table.fee .who { display: block; font-size: 8pt; color: #374740; }
.rf .declare { margin-top: 2mm; padding: 2mm 3mm; background: #f4f7f5; border-radius: 1.5mm; font-size: 8.4pt; line-height: 1.45; }
.rf .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 4mm; font-size: 8.4pt; }
.rf .sign div { border-top: 0.3mm solid #4b5b54; padding-top: 1mm; }
.rf .office { border: 0.5mm solid #06281e; border-radius: 2mm; padding: 1.5mm 3.5mm 0.5mm; margin-top: 3mm; }
.rf .office .h { font-weight: 700; color: #06281e; font-size: 9.5pt; margin-bottom: 1mm; }
.rf .foot { margin-top: 2mm; font-size: 7.4pt; color: #5b6b64; text-align: center; }
`;

const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }) : "");
const dob = (ymd: string | null) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "");

function Field({ bn, en, value }: { bn: string; en: string; value: React.ReactNode }) {
  return (
    <div className="field">
      <div className="lbl">
        <span>{bn}</span> <span className="en">{en}</span>
      </div>
      <div className="val">{value || " "}</div>
    </div>
  );
}

function Check({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className="chk">
      <span className={`tick${on ? " on" : ""}`}>{on ? "✓" : ""}</span>
      {children}
    </span>
  );
}

function Boxes({ value, length }: { value: string; length: number }) {
  const chars = value.slice(0, length).padEnd(length, " ").split("");
  return (
    <span className="boxes">
      {chars.map((c, i) => (
        <span key={i} className="box">{c.trim()}</span>
      ))}
    </span>
  );
}

const SECTIONS: [string, string, string][] = [
  ["Science", "বিজ্ঞান", "Science"],
  ["Business Studies", "ব্যবসায় শিক্ষা", "Business"],
  ["Humanities", "মানবিক", "Humanities"],
];

export default function FilledRegistrationForm({ form }: { form: Form }) {
  const confirmed = form.status === "CONFIRMED" || form.status === "CHECKED_IN";
  const section = (form.section ?? "").toLowerCase();
  return (
    <div className="rf sheet shadow-md">
      <div className="head">
        <img src="/logo.png" alt="" />
        <div>
          <div className="t1">প্রাক্তন সবুজিয়ান পরিষদ</div>
          <div className="t2">Praktan Sabujian Parishad · alumni of Sabuj Shikshayatan Government High School</div>
          <div className="t3">সীতাকুণ্ড, চট্টগ্রাম · EIIN 105070 · প্রতিষ্ঠা ১৯৭৬</div>
        </div>
        <div className="formno">
          ফর্ম নং / Form no.
          <br />
          <b>{form.formNo}</b>
        </div>
      </div>

      <div className="titlebar">
        <div className="a">{form.eventTitle} · রেজিস্ট্রেশন ফর্ম</div>
        <div className="b">
          Registration form · {form.channel === "paper" ? "paper form, typed in" : "registered online"}
        </div>
      </div>
      <div className="facts">
        <span>রেজিস্ট্রেশন: <b>{day(form.registeredOn)}</b></span>
        <span>স্থান: <b>{form.venue}</b></span>
        <span>
          অবস্থা <span className="en">Status</span>:{" "}
          <span className={`stamp ${confirmed ? "ok" : "wait"}`}>{confirmed ? (form.status === "CHECKED_IN" ? "CHECKED IN" : "CONFIRMED") : "PENDING PAYMENT CHECK"}</span>
        </span>
      </div>

      <h2><span className="n">১</span> ব্যক্তিগত তথ্য <span className="en">Personal details</span></h2>
      <div className="top">
        <div>
          <Field bn="পূর্ণ নাম" en="Full name" value={form.name} />
          <div className="row">
            <span>এসএসসি ব্যাচ</span> <span className="en">SSC batch</span> <Boxes value={form.batch ? String(form.batch) : ""} length={4} />
            &nbsp;&nbsp;<span>রোল নং</span> <span className="en">Roll</span> <b>{form.rollNumber ?? "—"}</b>
          </div>
          <div className="row">
            <span>বিভাগ:</span>
            {SECTIONS.map(([key, bn, en]) => (
              <Check key={key} on={section === key.toLowerCase()}>
                {bn} <span className="en">{en}</span>
              </Check>
            ))}
            {form.section && !SECTIONS.some(([key]) => key.toLowerCase() === section) && <b>{form.section}</b>}
          </div>
          <div className="row">
            <span>রক্তের গ্রুপ</span> <span className="en">Blood group</span>
            {BLOOD_GROUPS.map((g) => (
              <Check key={g} on={form.bloodGroup === g}>{g}</Check>
            ))}
          </div>
          <div className="row">
            <span>মোবাইল নম্বর</span> <span className="en">Mobile</span> <Boxes value={(form.phone ?? "").replace(/\D/g, "").slice(-11)} length={11} />
          </div>
        </div>
        <div className="photo">
          {form.photoUrl ? <img src={form.photoUrl} alt="" /> : <span>পাসপোর্ট সাইজ ছবি<br /><br /><span className="en">No photo on file</span></span>}
        </div>
      </div>
      <div className="grid3">
        <Field bn="জন্ম তারিখ" en="Date of birth" value={dob(form.dateOfBirth)} />
        <Field bn="পেশা" en="Profession" value={form.profession} />
        <Field bn="পদবী" en="Designation" value={form.designation} />
      </div>
      <div className="grid3">
        <Field bn="কোম্পানি" en="Company" value={form.company} />
        <Field bn="ইমেইল" en="Email" value={form.email} />
        <Field bn="ঠিকানা" en="Present address" value={form.address} />
      </div>

      <h2><span className="n">২</span> রেজিস্ট্রেশন ফি <span className="en">Registration fee</span></h2>
      <table className="fee">
        <thead>
          <tr>
            <th>বিবরণ <span className="en">Item</span></th>
            <th className="c">সংখ্যা</th>
            <th className="r">টাকা</th>
          </tr>
        </thead>
        <tbody>
          {form.lines.map((l, i) => (
            <tr key={i}>
              <td>
                {l.label}
                {l.who && <span className="who">নাম <span className="en">Name{l.who.includes(",") ? " (age)" : ""}</span>: {l.who}</span>}
              </td>
              <td className="c">{l.count}</td>
              <td className="r">{taka(l.amount)}</td>
            </tr>
          ))}
          {form.donation > 0 && (
            <tr>
              <td>অনুদান <span className="en">Donation</span></td>
              <td className="c">—</td>
              <td className="r">{taka(form.donation)}</td>
            </tr>
          )}
          <tr className="total">
            <td>সর্বমোট <span className="en">Total · {form.headCount} {form.headCount === 1 ? "person" : "people"}</span></td>
            <td className="c"></td>
            <td className="r">{taka(form.total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="row" style={{ marginTop: "2mm" }}>
        <span>টি-শার্টের সাইজ:</span>
        {["S", "M", "L", "XL", "XXL"].map((s) => (
          <Check key={s} on={form.tshirtSize === s}>{s}</Check>
        ))}
        &nbsp;
        <Check on={form.volunteer}>
          স্বেচ্ছাসেবক হতে চাই <span className="en">I&apos;d like to volunteer</span>
        </Check>
      </div>

      <h2><span className="n">৩</span> পেমেন্ট <span className="en">Payment</span></h2>
      <div className="row">
        {PAYMENT_METHODS.map((m) => (
          <Check key={m} on={form.paymentMethod === m}>{m}</Check>
        ))}
        {form.total === 0 && <b>No payment needed</b>}
      </div>
      <div className="row">
        <span>ট্রানজেকশন আইডি</span> <span className="en">Transaction ID</span> <Boxes value={form.transactionId ?? ""} length={14} />
      </div>

      <h2><span className="n">৪</span> প্রমাণপত্র <span className="en">Proof that the member studied at the school</span></h2>
      <div className="row">
        {PROOF_TYPES.map((t) => (
          <Check key={t.value} on={form.proofType === t.value}>{t.label}</Check>
        ))}
      </div>

      <div className="declare">
        আমি ঘোষণা করছি যে উপরের সব তথ্য সত্য এবং আমি সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের প্রাক্তন শিক্ষার্থী। কমিটি পেমেন্ট ও প্রমাণপত্র যাচাই করে আমার রেজিস্ট্রেশন নিশ্চিত করবে।
        <br />
        <span className="en">{form.channel === "online" ? "Agreed to online when registering on the website." : "Signed on the paper form."}</span>
      </div>
      <div className="sign">
        <div>স্বাক্ষর <span className="en">Signature</span></div>
        <div>তারিখ <span className="en">Date</span>: {day(form.registeredOn)}</div>
      </div>

      <div className="office">
        <div className="h">অফিস কর্তৃক পূরণীয় · For office use only</div>
        <div className="grid4">
          <Field bn="যাচাইকারী" en="Checked by" value={form.confirmedBy} />
          <Field bn="তারিখ" en="Date" value={day(form.confirmedOn)} />
          <Field bn="প্রাপ্ত টাকা" en="Amount" value={confirmed ? taka(form.total) : ""} />
          <Field bn="ফর্ম নং" en="Form no." value={form.formNo} />
        </div>
        <div className="row">
          <Check on={confirmed}>পেমেন্ট যাচাই <span className="en">Payment checked</span></Check>
          <Check on={Boolean(form.proofType)}>প্রমাণপত্র <span className="en">Proof given</span></Check>
          <Check on={Boolean(form.photoUrl)}>ছবি আছে <span className="en">Photo</span></Check>
        </div>
      </div>
      <div className="foot">Printed from the association&apos;s website · registration {form.registrationId}</div>
    </div>
  );
}
