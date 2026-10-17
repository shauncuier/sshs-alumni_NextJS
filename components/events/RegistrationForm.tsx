"use client";

import React, { useEffect, useState } from "react";
import { usePaymentDetails } from "@/components/shared/usePaymentDetails";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { computeFee, formatTaka, normalizePackages } from "@/lib/events/pricing";
import { PAYMENT_METHODS, type MemberRegistration, type PublicEvent } from "@/lib/events/types";
import { PROOF_ACCEPT, PROOF_MAX_BYTES, PROOF_NOTE_MAX, PROOF_TYPES } from "@/lib/members/proof-types";
import { SUBCOMMITTEES } from "@/lib/volunteers-types";
import ContactVerifyField, { type ContactVerification } from "./ContactVerifyField";
import { FIRST_SSC_BATCH } from "@/lib/data";
import PasswordInput from "@/components/shared/PasswordInput";

const BATCH_YEARS = Array.from({ length: new Date().getFullYear() - FIRST_SSC_BATCH + 1 }, (_, i) => new Date().getFullYear() - i);
const input = "w-full px-3.5 py-3 sm:py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[46px] focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_MIN_SIDE = 600;
const label = "block text-xs font-semibold text-slate-700 mb-1.5";

/** Returns an error message, or null when the file is an acceptable profile photo. */
// Some Android phones (and iPhones sharing the original file) save photos as HEIC/HEIF,
// which the server cannot read: say what to do instead of a generic "wrong type".
const HEIC_HELP = "This photo is in HEIC format. Take a screenshot of it and upload the screenshot, or set the camera to save JPEG (Camera settings → Picture format).";
const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

async function checkPhoto(file: File): Promise<string | null> {
  if (isHeic(file)) return HEIC_HELP;
  if (!PHOTO_TYPES.includes(file.type)) return "Please upload a JPEG, PNG or WebP photo.";
  if (file.size > PHOTO_MAX_BYTES) return "The photo must be 5 MB or smaller.";
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (Math.min(width, height) < PHOTO_MIN_SIDE) return "The photo must be at least 600 × 600 pixels.";
  } catch {
    return "Please upload a JPEG, PNG or WebP photo.";
  }
  return null;
}

const PROOF_FILE_TYPES = PROOF_ACCEPT.split(",");
const PROOF_MISSING = "Please add a document that shows you studied at SSGHS.";

/** Returns an error message, or null when the file can be sent as the proof document. */
function checkProof(file: File): string | null {
  // Some systems send PDFs without a MIME type; the server checks the real bytes anyway.
  if (isHeic(file)) return HEIC_HELP;
  const looksLikePdf = !file.type && /\.pdf$/i.test(file.name);
  if (!PROOF_FILE_TYPES.includes(file.type) && !looksLikePdf) return "Please upload your proof as a JPEG, PNG, WebP or PDF file.";
  if (file.size > PROOF_MAX_BYTES) return "The proof document must be 10 MB or smaller.";
  return null;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * One form for joining (membership event, signed out: account + registration) and
 * for registering signed-in members. The live total uses the same rules as the server,
 * which recalculates it and is the only source of truth.
 */
export default function RegistrationForm({
  event,
  initialPackage,
  source,
  onRegistered,
}: {
  event: PublicEvent;
  initialPackage?: string;
  /** Where the visitor came from (the /jubilee link's ad tag), saved with the registration. */
  source?: string;
  onRegistered: (registration: MemberRegistration, createdAccount: boolean) => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const payment = usePaymentDetails();
  const isAuthed = sessionStatus === "authenticated" && Boolean(session?.user);
  const needsAccount = !isAuthed && Boolean(event.isMembershipEvent);
  // Step 1 (account details) only exists for signed-out visitors joining.
  const [step, setStep] = useState<1 | 2>(1);
  const showAccount = needsAccount && step === 1;
  const showRegistration = !needsAccount || step === 2;

  const [account, setAccount] = useState({ fullName: "", email: "", phone: "", password: "", sscBatch: "", rollNumber: "", section: "" });
  const [contactVerification, setContactVerification] = useState<ContactVerification | null>(null);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [packageName, setPackageName] = useState(initialPackage ?? event.packages[0]?.name ?? "");
  // How many of each guest type (Spouse, Child, ...) the member brings.
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [tshirtSize, setTshirtSize] = useState("L");
  const [mealPreference, setMealPreference] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerSubcommittee, setVolunteerSubcommittee] = useState<string>(SUBCOMMITTEES[0].id);
  const [volunteerNotes, setVolunteerNotes] = useState("");
  const [donation, setDonation] = useState("");
  const [paymentMethodChoice, setPaymentMethod] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [proofType, setProofType] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState<string | null>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [ocrDetectedTrx, setOcrDetectedTrx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!proof || !proof.type.startsWith("image/")) {
      setProofPreview(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const url = URL.createObjectURL(proof);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  const chooseProof = (file: File | undefined) => {
    setProof(null);
    setProofError(null);
    if (!file) return;
    const problem = checkProof(file);
    if (problem) setProofError(problem);
    else setProof(file);
  };

  const chooseReceipt = async (file: File | undefined) => {
    setPaymentReceipt(null);
    setPaymentReceiptPreview(null);
    setOcrDetectedTrx(null);
    if (!file) return;

    setPaymentReceipt(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPaymentReceiptPreview(url);

      // Trigger automatic OCR scan to read Transaction ID from screenshot
      setIsScanningReceipt(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/ocr", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.detectedTrxId) {
            setTransactionId(data.detectedTrxId);
            setOcrDetectedTrx(data.detectedTrxId);
          }
        }
      } catch (ocrErr) {
        console.warn("Auto OCR scan note:", ocrErr);
      } finally {
        setIsScanningReceipt(false);
      }
    }
  };

  /** The first problem with the proof section, or null when it is complete. */
  const proofProblem = (): string | null => {
    if (!proofType) return "Please choose the type of document.";
    if (proofType === "OTHER" && !proofNote.trim()) return "Please describe the document.";
    if (!proof) return proofError ?? PROOF_MISSING;
    return null;
  };

  const choosePhoto = async (file: File | undefined) => {
    setPhoto(null);
    setPhotoError(null);
    if (!file) return;
    const problem = await checkPhoto(file);
    if (problem) setPhotoError(problem);
    else setPhoto(file);
  };

  if (joined) {
    return (
      <div role="status" className="space-y-3 text-xs">
        <p className="font-bold text-emerald-900">
          Registered — payment and membership under review. You can sign in once the committee approves your membership.
        </p>
        <div className="flex gap-2">
          <Link href="/events" className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold">Back to events</Link>
          <Link href="/" className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">Home</Link>
        </div>
      </div>
    );
  }
  if (sessionStatus === "loading" && !event.isMembershipEvent) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-2">
        <p role="status" className="text-xs font-semibold text-slate-500 animate-pulse">Loading event registration…</p>
      </div>
    );
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

  // The member's fee can depend on their SSC batch: the one picked below, or a signed-in member's.
  const memberBatch = needsAccount ? account.sscBatch || null : (session?.user as { batchYear?: number } | undefined)?.batchYear ?? null;
  const batchPriced = event.batchFees.length > 0 && !packageName;
  let total: ReturnType<typeof computeFee> | null = null;
  try {
    total = computeFee(
      {
        registrationFee: event.registrationFeeAmount,
        extraAdultFee: event.extraAdultFee,
        childFee: event.childFee,
        packages: normalizePackages(event.packages.map((p) => ({ ...p, price: p.priceAmount }))),
        guestTypes: event.customGuestTypes ? event.guestTypes : [],
        batchFees: event.batchFees,
      },
      { packageName, guests: guestCounts, donationAmount: donation ? Number(donation) : 0 },
      { sscBatch: memberBatch }
    );
  } catch {
    total = null;
  }
  const paid = (total?.total ?? 0) > 0;
  // The methods the association accepts (Admin → Payment settings); all of them only
  // when nothing is set there and the event gives its own instructions.
  const methods: string[] = event.paymentMethods.length > 0 ? event.paymentMethods : [...PAYMENT_METHODS];
  const paymentMethod = paymentMethodChoice && methods.includes(paymentMethodChoice) ? paymentMethodChoice : methods[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingAccount(false);
    setSubmitting(true);
    try {
      const volunteerNoteFormatted = isVolunteer
        ? `[Volunteer: ${SUBCOMMITTEES.find((s) => s.id === volunteerSubcommittee)?.name || volunteerSubcommittee}]${volunteerNotes.trim() ? ` ${volunteerNotes.trim()}` : ""}`
        : null;

      const payload = JSON.stringify({
          account: needsAccount
            ? {
                ...account,
                sscBatch: Number(account.sscBatch),
                phoneVerificationToken: contactVerification?.via === "phone" ? contactVerification.token : null,
                emailVerificationToken: contactVerification?.via === "email" ? contactVerification.token : null,
              }
            : undefined,
          proof: needsAccount ? { type: proofType, note: proofType === "OTHER" ? proofNote.trim() : null } : undefined,
          rsvp: {
            packageName: event.packages.length ? packageName : null,
            guests: guestCounts,
            source: source ?? null,
            tshirtSize,
            mealPreference: mealPreference || null,
            notes: volunteerNoteFormatted,
            donationAmount: donation ? Number(donation) : 0,
            paymentMethod: paid ? paymentMethod : null,
            transactionId: paid ? transactionId : null,
          },
        });
      // Joining sends the photo and the proof along, so it goes as multipart; signed-in members stay JSON unless sending a payment receipt.
      let res: Response;
      if (needsAccount) {
        if (!photo) throw new Error("Please add a profile photo.");
        const problem = proofProblem();
        if (problem || !proof) throw new Error(problem ?? PROOF_MISSING);
        const form = new FormData();
        form.append("payload", payload);
        form.append("photo", photo);
        form.append("proof", proof);
        if (paymentReceipt) form.append("paymentReceipt", paymentReceipt);
        res = await fetch(`/api/events/${event.slug}/rsvp`, { method: "POST", body: form });
      } else if (paymentReceipt) {
        const form = new FormData();
        form.append("payload", payload);
        form.append("paymentReceipt", paymentReceipt);
        res = await fetch(`/api/events/${event.slug}/rsvp`, { method: "POST", body: form });
      } else {
        res = await fetch(`/api/events/${event.slug}/rsvp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      }
      const body = await res.json();
      if (!res.ok) {
        if (body.code === "EMAIL_EXISTS") setExistingAccount(true);
        // The 30-minute verification ran out while filling in the form: verify again on step 1.
        if (["PHONE_NOT_VERIFIED", "EMAIL_NOT_VERIFIED", "CONTACT_NOT_VERIFIED"].includes(body.code)) {
          setContactVerification(null);
          setPhoneRequired(true);
          setStep(1);
        }
        throw new Error(body.error || "Registration failed. Please try again.");
      }
      // A new member is not signed in: the committee must approve the membership first.
      if (body.createdAccount) setJoined(true);
      if (isVolunteer) {
        fetch("/api/volunteers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Signed-in members: the server fills these from their profile.
            ...(needsAccount ? { fullName: account.fullName, email: account.email, phone: account.phone, sscBatch: Number(account.sscBatch) } : {}),
            subcommittee: volunteerSubcommittee,
            notes: volunteerNotes.trim() || undefined,
            source: "EVENT_REGISTRATION",
          }),
        }).catch(() => {});
      }
      onRegistered(body.registration, Boolean(body.createdAccount));
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
          <div className="sm:col-span-2 flex items-center gap-4">
            <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 text-center">
              {photoPreview ? <img loading="lazy" decoding="async" src={photoPreview} alt="Your profile photo preview" className="w-full h-full object-cover" /> : "No photo"}
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="reg-photo" className={label}>Profile photo *</label>
              <input
                id="reg-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void choosePhoto(e.target.files?.[0])}
                aria-describedby="reg-photo-help"
                className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-bold"
              />
              <p id="reg-photo-help" className="text-[11px] text-slate-500 mt-1">
                A clear, recent photo of your face. It will be used on your alumni card and in association publications. JPEG, PNG or WebP, up to 5 MB, at least 600 × 600 px.
              </p>
              {photoError && <p role="alert" className="text-[11px] font-bold text-rose-700 mt-1">{photoError}</p>}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reg-name" className={label}>Full name *</label>
            <input id="reg-name" required autoComplete="name" className={input} value={account.fullName} onChange={(e) => setAccount({ ...account, fullName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-email" className={label}>Email *</label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              className={input}
              value={account.email}
              onChange={(e) => {
                setAccount({ ...account, email: e.target.value });
                // An email verification only holds for the address that received the code.
                if (contactVerification?.via === "email") setContactVerification(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="reg-password" className={label}>Password (8+ characters) *</label>
            <PasswordInput id="reg-password" minLength={8} required autoComplete="new-password" className={input} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
          </div>
          <ContactVerifyField
            phone={account.phone}
            onPhoneChange={(phone) => setAccount((a) => ({ ...a, phone }))}
            email={account.email}
            verification={contactVerification}
            onVerification={setContactVerification}
            showRequired={phoneRequired}
          />
          <div>
            <label htmlFor="reg-batch" className={label}>SSC batch *</label>
            <select id="reg-batch" required className={input} value={account.sscBatch} onChange={(e) => setAccount({ ...account, sscBatch: e.target.value })}>
              <option value="" disabled>Choose your SSC batch</option>
              {BATCH_YEARS.map((y) => <option key={y} value={y}>SSC Batch {y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reg-roll" className={label}>Roll number</label>
            <input id="reg-roll" inputMode="numeric" className={input} value={account.rollNumber} onChange={(e) => setAccount({ ...account, rollNumber: e.target.value })} />
          </div>
          <div>
            <label htmlFor="reg-section" className={label}>Section / Discipline</label>
            <select id="reg-section" className={input} value={account.section} onChange={(e) => setAccount({ ...account, section: e.target.value })}>
              <option value="">— Select Section or Discipline —</option>
              <option value="Science">Science (বিজ্ঞান বিভাগ)</option>
              <option value="Business Studies">Business Studies (ব্যবসায় শিক্ষা / বাণিজ্য)</option>
              <option value="Humanities">Humanities (মানবিক বিভাগ)</option>
              <option value="Section A">Section A (Morning Shift)</option>
              <option value="Section B">Section B (Day Shift)</option>
            </select>
          </div>
          <fieldset className="sm:col-span-2 min-w-0 p-3 rounded-xl border border-slate-300 bg-slate-50/60 space-y-3" aria-describedby="reg-proof-help">
            <legend className="px-1 text-xs font-bold text-slate-800">Proof you studied at SSGHS *</legend>
            <p id="reg-proof-help" className="text-[11px] text-slate-500">
              Only the alumni committee can see this. It is deleted after your membership is decided.
            </p>
            <div>
              <label htmlFor="reg-proof-type" className={label}>Type of document *</label>
              <select id="reg-proof-type" required className={input} value={proofType} onChange={(e) => setProofType(e.target.value)}>
                <option value="">Choose a document…</option>
                {PROOF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {proofType === "OTHER" && (
              <div>
                <label htmlFor="reg-proof-note" className={label}>Describe the document *</label>
                <input
                  id="reg-proof-note"
                  required
                  maxLength={PROOF_NOTE_MAX}
                  className={input}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. Letter from the headmistress"
                />
              </div>
            )}
            <div>
              <label htmlFor="reg-proof-file" className={label}>Document *</label>
              <input
                id="reg-proof-file"
                type="file"
                accept={PROOF_ACCEPT}
                onChange={(e) => chooseProof(e.target.files?.[0])}
                aria-describedby="reg-proof-file-help"
                className="block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-800 file:font-bold"
              />
              <p id="reg-proof-file-help" className="text-[11px] text-slate-500 mt-1">A photo or scan (JPEG, PNG or WebP) or a PDF, up to 10 MB.</p>
              {proof && (
                <div className="mt-2 flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-white border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {proofPreview ? <img loading="lazy" decoding="async" src={proofPreview} alt="Your proof document preview" className="w-full h-full object-cover" /> : "PDF"}
                  </div>
                  <div className="min-w-0 text-[11px]">
                    <div className="font-semibold text-slate-800 truncate">{proof.name}</div>
                    <div className="text-slate-500">{formatSize(proof.size)}</div>
                  </div>
                </div>
              )}
              {proofError && <p role="alert" className="text-[11px] font-bold text-rose-700 mt-1">{proofError}</p>}
            </div>
          </fieldset>
          <button
            type="button"
            className="sm:col-span-2 py-3.5 px-4 min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).form!;
              if (!photo && !photoError) setPhotoError("Please add a profile photo.");
              // The type and note are required fields (reportValidity shows those); the file is checked here.
              if (!proof && !proofError) setProofError(PROOF_MISSING);
              setPhoneRequired(!contactVerification);
              if (form.reportValidity() && photo && !proofProblem() && contactVerification) setStep(2);
            }}
          >
            Continue to registration &amp; payment →
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
            {event.guestTypes.map((g, i) => (
              <div key={g.name}>
                <label htmlFor={`reg-guest-${i}`} className={label}>
                  {g.name}
                  {g.price > 0 ? ` (+${formatTaka(g.price)} each)` : ""}
                </label>
                <input
                  id={`reg-guest-${i}`}
                  type="number"
                  min={0}
                  max={g.max}
                  className={input}
                  value={guestCounts[g.name] ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(g.max, Math.floor(Number(e.target.value)) || 0));
                    setGuestCounts((c) => ({ ...c, [g.name]: n }));
                  }}
                />
                {g.max < 10 && <p className="text-[10px] text-slate-500 mt-0.5">Up to {g.max}</p>}
              </div>
            ))}
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

          {/* Volunteer Squad Opt-In */}
          <div className="p-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 text-xs space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isVolunteer}
                onChange={(e) => setIsVolunteer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-emerald-600 focus:ring-offset-0 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-900 block">
                  Join the Organizing Committee Volunteer Squad (ঐচ্ছিক স্বেচ্ছাসেবী)
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  Help during the event; the committee will contact you about tasks.
                </span>
              </div>
            </label>

            {isVolunteer && (
              <div className="pt-2 border-t border-emerald-200/60 space-y-2.5">
                <div>
                  <label htmlFor="reg-subcommittee" className={label}>
                    Preferred Committee Wing / Sub-Committee *
                  </label>
                  <select
                    id="reg-subcommittee"
                    className={input}
                    value={volunteerSubcommittee}
                    onChange={(e) => setVolunteerSubcommittee(e.target.value)}
                  >
                    {SUBCOMMITTEES.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} — {sub.bengaliName}
                      </option>
                    ))}
                  </select>
                  {SUBCOMMITTEES.find((s) => s.id === volunteerSubcommittee) && (
                    <p className="text-[11px] text-emerald-800 mt-1 italic">
                      {SUBCOMMITTEES.find((s) => s.id === volunteerSubcommittee)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-vol-notes" className={label}>
                    Relevant experience or availability notes (optional)
                  </label>
                  <input
                    id="reg-vol-notes"
                    type="text"
                    maxLength={150}
                    className={input}
                    value={volunteerNotes}
                    onChange={(e) => setVolunteerNotes(e.target.value)}
                    placeholder="e.g. Doctor on standby, photography gear, gate scanner shift"
                  />
                </div>
              </div>
            )}
          </div>

          {total && batchPriced && !memberBatch && (
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              The fee depends on your SSC batch: choose your batch above to see your total.
            </p>
          )}
          {total && !(batchPriced && !memberBatch) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              {total.guests.length > 0 || batchPriced ? (
                <>
                  <div className="flex justify-between">
                    <span>{total.pkg ? total.pkg.name : batchPriced ? `Alumnus (batch ${memberBatch})` : "Member"}</span>
                    <strong>{formatTaka(total.pkg ? total.pkg.price : total.fee - total.guests.reduce((sum, g) => sum + g.count * g.price, 0))}</strong>
                  </div>
                  {total.guests.map((g) => (
                    <div key={g.name} className="flex justify-between">
                      <span>{g.name} × {g.count}</span>
                      <strong>{formatTaka(g.count * g.price)}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-200 pt-1"><span>Registration</span><strong>{formatTaka(total.fee)}</strong></div>
                </>
              ) : (
                <div className="flex justify-between"><span>Registration</span><strong>{formatTaka(total.fee)}</strong></div>
              )}
              {total.donation > 0 && <div className="flex justify-between"><span>Donation</span><strong>{formatTaka(total.donation)}</strong></div>}
              <div className="flex justify-between text-sm"><span className="font-bold">Total to pay</span><strong>{formatTaka(total.total)}</strong></div>
              <div className="text-slate-500">{total.headCount} {total.headCount === 1 ? "person" : "people"}</div>
            </div>
          )}

          {paid && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold">How to pay {total ? formatTaka(total.total) : ""}</p>
                {payment?.lines.map((line) => <p key={line}>{line}</p>)}
                {event.paymentInstructions && <p className="whitespace-pre-line pt-1">{event.paymentInstructions}</p>}
              </div>
              <div>
                <p id="reg-pay-channel" className={label}>Select Payment Channel *</p>
                <div role="group" aria-labelledby="reg-pay-channel" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {methods.map((m) => {
                    const isSelected = paymentMethod === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        aria-pressed={isSelected}
                        className={`min-h-[46px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                          isSelected
                            ? m === "bKash"
                              ? "bg-[#e2136e] text-white border-[#e2136e] shadow-sm ring-2 ring-[#e2136e]/20"
                              : m === "Nagad"
                                ? "bg-[#f7941d] text-white border-[#f7941d] shadow-sm ring-2 ring-[#f7941d]/20"
                                : m === "Bangla QR"
                                  ? "bg-[#006a4e] text-white border-[#006a4e] shadow-sm ring-2 ring-[#006a4e]/20"
                                  : m === "Bank"
                                  ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20"
                                  : "bg-emerald-800 text-white border-emerald-800 shadow-sm ring-2 ring-emerald-800/20"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <span>{m}</span>
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === "Bangla QR" && (
                <div className="p-3.5 rounded-xl border border-[#006a4e]/30 bg-emerald-50/60 flex flex-col sm:flex-row items-center gap-4">
                  {payment?.banglaQrImage && (
                    <img loading="lazy" decoding="async" src={payment.banglaQrImage} alt="Bangla QR code for paying the association" className="w-48 h-48 shrink-0 bg-white rounded-xl border object-contain p-2" />
                  )}
                  <div className="text-[11px] text-slate-700 space-y-1.5">
                    <p className="font-bold text-[#006a4e] text-xs">Pay with Bangla QR</p>
                    {payment?.banglaQrMerchant && <p>Merchant: <strong>{payment.banglaQrMerchant}</strong></p>}
                    <p>
                      {payment?.banglaQrImage ? "Scan this code" : "Scan the association's Bangla QR code"} with any bank or mobile banking app
                      (bKash, Nagad, Rocket, Upay or your bank&apos;s app), pay <strong>{total ? formatTaka(total.total) : "the total"}</strong>,
                      then enter the transaction ID from the payment receipt below.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="reg-trx" className={label}>
                  {paymentMethod === "Cash" ? "Cash Voucher / Receipt Serial No. *" : `${paymentMethod} Transaction ID (TrxID) *`}
                </label>
                <input
                  id="reg-trx"
                  required
                  className={input}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder={paymentMethod === "Cash" ? "e.g. CASH-2026-0042" : "e.g. 9AB3XK1LQ"}
                />
                {ocrDetectedTrx && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                    ✨ Auto-detected from receipt: {ocrDetectedTrx}
                  </span>
                )}
              </div>

              {/* Payment Proof Screenshot Upload with OCR */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="reg-receipt" className={label}>
                    Upload Payment Proof Screenshot (Recommended)
                  </label>
                  {isScanningReceipt && (
                    <span className="text-[10px] text-amber-700 font-semibold animate-pulse">
                      🤖 Scanning with OCR…
                    </span>
                  )}
                </div>
                <input
                  id="reg-receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => void chooseReceipt(e.target.files?.[0])}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-900 file:font-bold cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">
                  Upload screenshot of your bKash, Nagad, Rocket or Bank SMS/App confirmation (JPEG, PNG, WebP or PDF, up to 10 MB).
                </p>
                {paymentReceiptPreview && (
                  <div className="mt-2 flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                    <img loading="lazy" decoding="async"
                      src={paymentReceiptPreview}
                      alt="Payment receipt preview"
                      className="w-12 h-12 object-cover rounded-md border border-slate-200 shrink-0"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-800">{paymentReceipt?.name}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">✓ Screenshot attached for faster verification</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs font-bold text-rose-700">
              {error}{" "}
              {existingAccount && <Link href={`/login?callbackUrl=/events/${event.slug}`} className="underline">Sign in</Link>}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            {needsAccount && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 min-h-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !total}
              className="flex-1 py-3 px-5 min-h-[48px] rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Submitting RSVP…</span>
              ) : event.isMembershipEvent && needsAccount ? (
                <span>Join Alumni Association &amp; Register</span>
              ) : (
                <span>Complete Registration &amp; RSVP</span>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
