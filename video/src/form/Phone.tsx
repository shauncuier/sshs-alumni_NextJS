import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { CalendarDays, Check, ChevronDown, Clock, FileText, Hourglass, Lock, MapPin, Mail, RotateCw, Ticket } from "lucide-react";
import { fonts } from "../theme";
import {
  BAR,
  CH,
  EMAIL_AT,
  GATE_AT,
  isFocused,
  LANDING_AT,
  LANDING_BUTTON_Y,
  PHOTO_AT,
  pickedAt,
  PROOF_AT,
  PROOF_NOTE_AT,
  QR_AT,
  QR_SCAN_AT,
  REVIEW_AT,
  S1,
  S2,
  scrollAt,
  screenAt,
  sheetAt,
  sheetOptionY,
  SHOT_AT,
  SPOUSE_AT,
  STEP1_AT,
  STEP2_AT,
  SUBMIT_AT,
  TICKET_AT,
  TOTAL_AT,
  typedAt,
  VH,
  VW,
  fingerAt,
} from "./timeline";

const C = {
  page: "#f4f6f5",
  green: "#072a1f",
  emerald: "#065f46",
  emerald50: "#ecfdf5",
  slate900: "#0f172a",
  slate700: "#334155",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  amber: "#fcd34d",
  qr: "#006a4e",
};
const sans = `${fonts.en}, ${fonts.bn}, sans-serif`;
const bnSans = `${fonts.bn}, ${fonts.en}, sans-serif`;

/* ---------- Small form parts ---------- */

const Label: React.FC<{ children: React.ReactNode; top: number }> = ({ children, top }) => (
  <div style={{ position: "absolute", left: 16, right: 16, top, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>{children}</div>
);
const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ fontWeight: 400, color: C.slate400 }}>{children}</span>;

const Box: React.FC<{ top: number; focused?: boolean; left?: number; right?: number; children?: React.ReactNode; h?: number; style?: React.CSSProperties }> = ({
  top,
  focused,
  left = 16,
  right = 16,
  children,
  h = 46,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      right,
      top,
      height: h,
      borderRadius: 12,
      background: "white",
      border: `1.5px solid ${focused ? "#059669" : C.slate300}`,
      boxShadow: focused ? "0 0 0 4px rgba(16,185,129,0.22)" : "none",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      fontFamily: sans,
      fontSize: 15,
      color: C.slate900,
      gap: 6,
      ...style,
    }}
  >
    {children}
  </div>
);

const Caret: React.FC<{ t: number }> = ({ t }) => (
  <span style={{ display: "inline-block", width: 2, height: 19, background: "#059669", opacity: Math.floor(t * 2.2) % 2 === 0 ? 1 : 0, marginLeft: 1 }} />
);

/** A text input that types its value in, with a caret while focused. */
const TextField: React.FC<{ id: string; top: number; label: React.ReactNode; t: number; placeholder?: string; left?: number; right?: number; labelLeft?: number }> = ({
  id,
  top,
  label,
  t,
  placeholder,
  left,
  right,
}) => {
  const value = typedAt(id, t);
  const focused = isFocused(id, t);
  return (
    <>
      <div style={{ position: "absolute", left: left ?? 16, right: right ?? 16, top, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>{label}</div>
      <Box top={top + 22} focused={focused} left={left} right={right}>
        <span style={{ color: value ? C.slate900 : C.slate400, whiteSpace: "nowrap", overflow: "hidden" }}>{value || placeholder || ""}</span>
        {focused && <Caret t={t} />}
      </Box>
    </>
  );
};

const SelectField: React.FC<{ id: string; top: number; label: React.ReactNode; t: number; placeholder: string; left?: number; right?: number }> = ({
  id,
  top,
  label,
  t,
  placeholder,
  left,
  right,
}) => {
  const v = pickedAt(id, t);
  return (
    <>
      <div style={{ position: "absolute", left: left ?? 16, right: right ?? 16, top, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>{label}</div>
      <Box top={top + 22} focused={isFocused(id, t)} left={left} right={right} style={{ justifyContent: "space-between" }}>
        <span style={{ color: v ? C.slate900 : C.slate500, fontFamily: bnSans }}>{v ?? placeholder}</span>
        <ChevronDown size={18} color={C.slate500} />
      </Box>
    </>
  );
};

const FileField: React.FC<{ top: number; focused: boolean; chosen: string | null; size?: string }> = ({ top, focused, chosen, size }) => (
  <Box top={top} focused={focused} style={{ padding: "0 6px", fontSize: 13 }}>
    <span style={{ background: C.emerald50, color: C.emerald, fontWeight: 700, borderRadius: 8, padding: "7px 10px" }}>Choose file</span>
    <span style={{ color: chosen ? C.slate900 : C.slate500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chosen ?? "No file chosen"}</span>
    {chosen && size && <span style={{ marginLeft: "auto", color: C.slate500, fontSize: 12 }}>{size}</span>}
  </Box>
);

const Stepper: React.FC<{ step: 1 | 2; top: number }> = ({ step, top }) => (
  <div style={{ position: "absolute", left: 16, top, display: "flex", gap: 8, fontFamily: sans, fontSize: 12, fontWeight: 700 }}>
    <span style={{ color: step === 1 ? C.emerald : C.slate400 }}>1. Your details</span>
    <span style={{ color: C.slate300 }}>/</span>
    <span style={{ color: step === 2 ? C.emerald : C.slate400 }}>2. Registration &amp; payment</span>
  </div>
);

const FormHeader: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 66, background: C.green, display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
    <Img src={staticFile("logo-large.webp")} style={{ width: 34, height: 34, borderRadius: 999, background: "white" }} />
    <div style={{ fontFamily: bnSans, color: "white", fontWeight: 700, fontSize: 15 }}>রেজিস্ট্রেশন ফর্ম</div>
    <div style={{ marginLeft: "auto", fontFamily: sans, color: C.amber, fontWeight: 700, fontSize: 12 }}>Golden Jubilee 2026</div>
  </div>
);

/* ---------- Screens ---------- */

const NewTab: React.FC = () => (
  <AbsoluteFill style={{ background: "white", alignItems: "center", justifyContent: "center", fontFamily: sans, color: C.slate400, fontSize: 15 }}>
    <div style={{ width: 64, height: 64, borderRadius: 999, border: `2px solid ${C.slate200}`, marginBottom: 12 }} />
    New tab
  </AbsoluteFill>
);

const Landing: React.FC<{ t: number }> = ({ t }) => {
  const pressed = t > STEP1_AT - 0.5 && t < STEP1_AT - 0.2;
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 420, background: C.green, textAlign: "center" }}>
        <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 118, height: 118, borderRadius: 26, background: "white", padding: 5, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", border: "3px solid rgba(252,211,77,0.4)" }}>
            <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
        <div style={{ marginTop: 16, fontFamily: sans, fontSize: 11, letterSpacing: "0.25em", fontWeight: 700, color: "rgba(252,211,77,0.9)" }}>1976 — 2026</div>
        <div style={{ fontFamily: bnSans, fontWeight: 800, fontSize: 34, color: C.amber, lineHeight: 1.3 }}>সুবর্ণ জয়ন্তী ২০২৬</div>
        <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 16, color: "white" }}>Golden Jubilee · Alumni reunion</div>
        <div style={{ margin: "14px 16px 0", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", textAlign: "left", fontFamily: sans, fontSize: 13, color: "white" }}>
          {[
            [CalendarDays, "Around 26 December 2026"],
            [Clock, "8:00 AM – 9:00 PM"],
            [MapPin, "School campus, Sitakunda"],
          ].map(([Icon, text], i) => {
            const I = Icon as typeof CalendarDays;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#0a3427", padding: "8px 14px", borderTop: i ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <I size={15} color={C.amber} /> {text as string}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 386, background: "white", borderRadius: 24, padding: "16px 16px", boxShadow: "0 16px 30px rgba(2,44,34,0.12)", border: `1px solid ${C.slate200}` }}>
        <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, color: C.slate500, letterSpacing: "0.06em" }}>REGISTRATION FEE</div>
        {[
          ["Batches 1989–2014", "৳1,500"],
          ["Batches 2015–2026", "৳1,250"],
        ].map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, background: "rgba(236,253,245,0.7)", border: "1px solid #d1fae5", borderRadius: 14, padding: "8px 14px" }}>
            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: "#064e3b" }}>{a}</span>
            <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 800, color: C.slate900 }}>{b}</span>
          </div>
        ))}
        <div style={{ height: 96 }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          top: LANDING_BUTTON_Y - 26,
          height: 52,
          borderRadius: 16,
          background: pressed ? "#047857" : C.emerald,
          transform: `scale(${pressed ? 0.97 : 1})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "white",
          fontFamily: bnSans,
          fontWeight: 800,
          fontSize: 16,
          boxShadow: "0 6px 14px rgba(6,95,70,0.35)",
        }}
      >
        রেজিস্ট্রেশন করুন <span style={{ color: "#6ee7b7" }}>·</span> <span style={{ fontFamily: sans }}>Register now</span>
      </div>
    </AbsoluteFill>
  );
};

const Step1: React.FC<{ t: number }> = ({ t }) => {
  const photo = t >= PHOTO_AT;
  const proof = t >= PROOF_AT;
  const noteGlow = interpolate(t, [PROOF_NOTE_AT, PROOF_NOTE_AT + 0.3, PROOF_NOTE_AT + 2.2, PROOF_NOTE_AT + 2.6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const contPressed = t > STEP2_AT - 0.45 && t < STEP2_AT - 0.15;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: S1.height, background: C.page }}>
      <FormHeader />
      <Stepper step={1} top={S1.stepper} />
      {/* Photo */}
      <div style={{ position: "absolute", left: 16, top: S1.photo, width: 84, height: 84, borderRadius: 999, overflow: "hidden", background: "#f1f5f9", border: `1.5px solid ${C.slate300}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {photo ? (
          <Img src={staticFile("form/person.svg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(t, [PHOTO_AT, PHOTO_AT + 0.25], [1.3, 1], { extrapolateRight: "clamp" })})` }} />
        ) : (
          <span style={{ fontFamily: sans, fontSize: 11, color: C.slate400 }}>No photo</span>
        )}
      </div>
      <div style={{ position: "absolute", left: 114, right: 16, top: S1.photo, fontFamily: sans }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.slate700 }}>Profile photo *</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ background: C.emerald50, color: C.emerald, fontWeight: 700, borderRadius: 8, padding: "7px 10px", boxShadow: isFocused("photo", t) ? "0 0 0 3px rgba(16,185,129,0.3)" : "none" }}>Choose file</span>
          <span style={{ color: photo ? C.slate900 : C.slate500 }}>{photo ? "my-photo.jpg" : "No file chosen"}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10.5, color: C.slate500, lineHeight: 1.35 }}>A clear, recent photo of your face. JPEG, PNG or WebP, up to 5 MB.</div>
      </div>

      <TextField id="nameEn" top={S1.nameEn} t={t} label="Full name (in English) *" />
      <TextField id="nameBn" top={S1.nameBn} t={t} label={<>Name in Bangla * <Hint>(বাংলায় নাম)</Hint></>} placeholder="যেমন: মোঃ রহিম উদ্দিন" />
      <TextField id="email" top={S1.email} t={t} label="Email *" />
      <TextField id="password" top={S1.password} t={t} label="Password (8+ characters) *" />
      <TextField id="phone" top={S1.phone} t={t} label="Mobile number *" placeholder="01XXXXXXXXX" />
      <SelectField id="batch" top={S1.batch} t={t} label="SSC batch *" placeholder="Choose your SSC batch" />
      <SelectField id="group" top={S1.group} t={t} label={<>Group <Hint>(বিভাগ)</Hint></>} placeholder="— Select your group —" />
      <SelectField id="gender" top={S1.gender} t={t} label={<>Gender * <Hint>(লিঙ্গ)</Hint></>} placeholder="Choose" />
      <TextField id="dob" top={S1.dob} t={t} label={<>Date of birth * <Hint>(জন্ম তারিখ)</Hint></>} placeholder="dd/mm/yyyy" />
      <TextField id="profession" top={S1.profession} t={t} label={<>Profession <Hint>(পেশা)</Hint></>} placeholder="e.g. Doctor, Engineer, Business" />
      <TextField id="address" top={S1.address} t={t} label={<>Present address <Hint>(ঠিকানা)</Hint></>} placeholder="House, road, area, city" />

      {/* Proof fieldset */}
      <div style={{ position: "absolute", left: 16, right: 16, top: S1.proof, height: 256, borderRadius: 14, border: `1.5px solid ${C.slate300}`, background: "rgba(248,250,252,0.8)" }} />
      <div style={{ position: "absolute", left: 28, right: 28, top: S1.proof + 10, fontFamily: sans }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.slate900 }}>Proof you studied at SSGHS *</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: noteGlow > 0 ? C.emerald : C.slate500,
            fontWeight: noteGlow > 0 ? 700 : 400,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: `rgba(16,185,129,${0.14 * noteGlow})`,
            borderRadius: 8,
            padding: "3px 6px",
            marginLeft: -6,
          }}
        >
          <Lock size={12} /> Only the alumni committee can see this.
        </div>
      </div>
      <SelectField id="proofType" top={S1.proofType} t={t} label="Type of document *" placeholder="Choose a document…" left={28} right={28} />
      <div style={{ position: "absolute", left: 28, right: 28, top: S1.proofDoc, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>Document *</div>
      <FileField top={S1.proofDoc + 22} focused={isFocused("proofDoc", t)} chosen={proof ? "ssc-certificate.jpg" : null} size="1.2 MB" />
      {proof && (
        <div style={{ position: "absolute", left: 28, top: S1.proofDoc + 76, display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 11, opacity: interpolate(t, [PROOF_AT, PROOF_AT + 0.2], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "white", border: `1px solid ${C.slate300}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={18} color={C.emerald} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: C.slate900 }}>ssc-certificate.jpg</div>
            <div style={{ color: C.slate500 }}>1.2 MB</div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: S1.cont,
          height: 52,
          borderRadius: 12,
          background: contPressed ? "#047857" : C.emerald,
          transform: `scale(${contPressed ? 0.97 : 1})`,
          color: "white",
          fontFamily: sans,
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 14px rgba(6,95,70,0.3)",
        }}
      >
        Continue to registration &amp; payment →
      </div>
    </div>
  );
};

const FakeQr: React.FC<{ size: number; t: number }> = ({ size, t }) => {
  const n = 25;
  const cell = size / n;
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x * cell} y={y * cell} width={7 * cell} height={7 * cell} fill="#0f172a" />
      <rect x={(x + 1) * cell} y={(y + 1) * cell} width={5 * cell} height={5 * cell} fill="white" />
      <rect x={(x + 2) * cell} y={(y + 2) * cell} width={3 * cell} height={3 * cell} fill="#0f172a" />
    </g>
  );
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
  const scanY = ((t - QR_SCAN_AT) % 1.4) / 1.4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {new Array(n * n).fill(0).map((_, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        if (inFinder(x, y) || random(`q${i}`) < 0.52) return null;
        return <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0f172a" />;
      })}
      {finder(0, 0)}
      {finder(18, 0)}
      {finder(0, 18)}
      {t >= QR_SCAN_AT && t < QR_SCAN_AT + 2.8 && <rect x={0} y={scanY * size - 2} width={size} height={4} fill="#10b981" opacity={0.85} />}
    </svg>
  );
};

const Step2: React.FC<{ t: number }> = ({ t }) => {
  const spouse = t >= SPOUSE_AT ? 1 : 0;
  const tshirt = pickedAt("tshirt", t);
  const qr = t >= QR_AT;
  const shot = t >= SHOT_AT;
  const totalGlow = interpolate(t, [TOTAL_AT, TOTAL_AT + 0.3, TOTAL_AT + 1.6, TOTAL_AT + 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const submitting = t >= SUBMIT_AT && t < REVIEW_AT;
  const half = (VW - 32 - 12) / 2;
  const row = (a: string, b: string, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 14 : 12.5, fontWeight: bold ? 800 : 400 }}>
      <span>{a}</span>
      <strong>{b}</strong>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: S2.height, background: C.page }}>
      <FormHeader />
      <Stepper step={2} top={S2.stepper} />
      {/* Guests */}
      <Label top={S2.guests}>Spouse (+৳600 each)</Label>
      <Box top={S2.guests + 22} focused={isFocused("spouse", t)} left={16} right={16 + half + 12}>
        <span style={{ fontWeight: spouse ? 700 : 400 }}>{spouse}</span>
      </Box>
      <div style={{ position: "absolute", left: 16 + half + 12, right: 16, top: S2.guests, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>Child, 5+ (+৳600 each)</div>
      <Box top={S2.guests + 22} left={16 + half + 12} right={16}>
        0
      </Box>
      <div style={{ position: "absolute", left: 16, right: 16, top: S2.guestBox, height: 100, borderRadius: 14, background: "#f8fafc", border: `1px solid ${C.slate200}`, opacity: spouse ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 12, top: 10, fontFamily: sans, fontSize: 12, fontWeight: 700, color: C.slate900 }}>Guest details</div>
      </div>
      {spouse > 0 && <TextField id="guestName" top={S2.guestBox + 30} t={t} label="Spouse: name *" left={28} right={28} />}
      <SelectField id="tshirt" top={S2.tshirt} t={t} label="T-shirt size" placeholder="M" left={16} right={16 + half + 12} />
      <div style={{ position: "absolute", left: 16 + half + 12, right: 16, top: S2.tshirt, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>Meal preference</div>
      <Box top={S2.tshirt + 22} left={16 + half + 12} right={16}>
        <span style={{ color: C.slate400 }}>e.g. Vegetarian</span>
      </Box>
      {/* Total */}
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          top: S2.total,
          padding: "10px 14px",
          borderRadius: 14,
          background: "#f8fafc",
          border: `1.5px solid ${totalGlow > 0 ? "#10b981" : C.slate200}`,
          boxShadow: `0 0 0 ${4 * totalGlow}px rgba(16,185,129,0.25)`,
          fontFamily: sans,
          color: C.slate900,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {row("Alumnus (batch 2013)", "৳1,500")}
        {spouse > 0 && row("Spouse × 1", "৳600")}
        <div style={{ borderTop: `1px solid ${C.slate200}`, marginTop: 2, paddingTop: 3 }}>{row("Registration", spouse ? "৳2,100" : "৳1,500")}</div>
        {row("Total to pay", spouse ? "৳2,100" : "৳1,500", true)}
        <div style={{ fontSize: 11, color: C.slate500 }}>{spouse ? "2 people" : "1 person"}{tshirt ? ` · T-shirt ${tshirt}` : ""}</div>
      </div>
      {/* How to pay */}
      <div style={{ position: "absolute", left: 16, right: 16, top: S2.howto, padding: "8px 12px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", fontFamily: sans, fontSize: 11, color: "#78350f", lineHeight: 1.4 }}>
        <div style={{ fontWeight: 800 }}>How to pay {spouse ? "৳2,100" : "৳1,500"}</div>
        Pay by Bangla QR, Bank or Cash, then fill in the details below.
      </div>
      {/* Channel */}
      <Label top={S2.channel}>Select Payment Channel *</Label>
      <div style={{ position: "absolute", left: 16, right: 16, top: S2.channel + 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {["Bangla QR", "Bank", "Cash"].map((m) => {
          const sel = qr && m === "Bangla QR";
          return (
            <div
              key={m}
              style={{
                height: 46,
                borderRadius: 12,
                border: `1.5px solid ${sel ? C.qr : C.slate300}`,
                background: sel ? C.qr : "white",
                color: sel ? "white" : C.slate700,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                boxShadow: sel ? "0 0 0 3px rgba(0,106,78,0.2)" : "none",
              }}
            >
              {m} {sel && <Check size={14} />}
            </div>
          );
        })}
      </div>
      {/* QR panel */}
      {qr && (
        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: S2.qr,
            height: 196,
            borderRadius: 14,
            border: "1.5px solid rgba(0,106,78,0.3)",
            background: "rgba(236,253,245,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            opacity: interpolate(t, [QR_AT, QR_AT + 0.25], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ padding: 6, background: "white", borderRadius: 12, border: `1px solid ${C.slate200}` }}>
            <FakeQr size={150} t={t} />
          </div>
          <div style={{ fontFamily: sans, fontSize: 11, color: C.slate700, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 800, color: C.qr, fontSize: 13 }}>Pay with Bangla QR</div>
            Scan with any bank or mobile banking app (bKash, Nagad, Rocket…) and pay <strong>{spouse ? "৳2,100" : "৳1,500"}</strong>.
          </div>
        </div>
      )}
      <TextField id="last4" top={S2.last4} t={t} label="Last 4 digits of the number you paid from *" placeholder="e.g. 5517" />
      <TextField id="paidAt" top={S2.paidAt} t={t} label="Payment date and time" placeholder="dd/mm/yyyy, --:--" />
      {/* Screenshot */}
      <div style={{ position: "absolute", left: 16, right: 16, top: S2.shot - 8, height: 128, borderRadius: 14, border: `1px solid ${C.slate200}`, background: "rgba(248,250,252,0.9)" }} />
      <div style={{ position: "absolute", left: 28, top: S2.shot, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.slate700 }}>Payment screenshot *</div>
      <Box top={S2.shot + 22} left={28} right={28} focused={isFocused("shot", t)} style={{ padding: "0 6px", fontSize: 13 }}>
        <span style={{ background: "#d1fae5", color: "#064e3b", fontWeight: 700, borderRadius: 8, padding: "7px 10px" }}>Choose file</span>
        <span style={{ color: shot ? C.slate900 : C.slate500 }}>{shot ? "payment-receipt.jpg" : "No file chosen"}</span>
      </Box>
      {shot && (
        <div style={{ position: "absolute", left: 30, top: S2.shot + 76, fontFamily: sans, fontSize: 11.5, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
          <Check size={14} /> Screenshot attached for faster verification
        </div>
      )}
      {/* Buttons */}
      <div style={{ position: "absolute", left: 16, top: S2.buttons, width: 76, height: 52, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.slate700 }}>Back</div>
      <div
        style={{
          position: "absolute",
          left: 102,
          right: 16,
          top: S2.buttons,
          height: 52,
          borderRadius: 12,
          background: submitting ? "#047857" : C.emerald,
          transform: `scale(${submitting && t < SUBMIT_AT + 0.25 ? 0.97 : 1})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: sans,
          fontSize: 12.5,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          padding: "0 10px",
          lineHeight: 1.25,
          boxShadow: "0 6px 14px rgba(6,95,70,0.3)",
        }}
      >
        {submitting ? (
          <>
            <RotateCw size={15} style={{ transform: `rotate(${t * 400}deg)`, marginRight: 6 }} /> Submitting…
          </>
        ) : (
          "Join Praktan Sabujian Parishad & Register"
        )}
      </div>
    </div>
  );
};

const Review: React.FC<{ t: number }> = ({ t }) => {
  const toast = interpolate(t, [EMAIL_AT, EMAIL_AT + 0.35], [-120, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 200, background: C.green }} />
      <div style={{ position: "absolute", left: 16, right: 16, top: 70, background: "white", borderRadius: 24, padding: 18, boxShadow: "0 16px 30px rgba(2,44,34,0.12)", border: `1px solid ${C.slate200}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: C.emerald50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Hourglass size={22} color="#d97706" />
          </div>
          <div>
            <div style={{ fontFamily: bnSans, fontWeight: 700, fontSize: 16, color: C.slate900 }}>আপনার পেমেন্ট যাচাই করা হচ্ছে</div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: "#475569", marginTop: 4, lineHeight: 1.45 }}>
              We have your payment. The committee is checking it; you get an email and your ticket once it is confirmed.
            </div>
          </div>
        </div>
      </div>
      {t >= EMAIL_AT && (
        <div style={{ position: "absolute", left: 10, right: 10, top: toast, background: "white", borderRadius: 18, padding: "12px 14px", boxShadow: "0 12px 30px rgba(0,0,0,0.25)", display: "flex", gap: 10, alignItems: "center", fontFamily: sans }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={20} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.slate900 }}>Praktan Sabujian Parishad</div>
            <div style={{ fontSize: 12, color: C.slate700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Your Golden Jubilee ticket is ready</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: C.slate400 }}>now</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const TicketScreen: React.FC<{ t: number }> = ({ t }) => {
  const gate = t >= GATE_AT;
  const pulse = 0.5 + 0.5 * Math.sin((t - TICKET_AT) * 5);
  return (
    <AbsoluteFill style={{ background: C.page, alignItems: "center" }}>
      <div style={{ marginTop: 24, fontFamily: sans, fontSize: 13, fontWeight: 700, color: C.slate500, alignSelf: "flex-start", marginLeft: 20 }}>My dashboard › Ticket</div>
      <div style={{ marginTop: 12, width: VW - 40, borderRadius: 24, overflow: "hidden", background: "white", boxShadow: "0 16px 34px rgba(2,44,34,0.18)", border: `1px solid ${C.slate200}` }}>
        <div style={{ background: C.green, padding: "16px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <Ticket size={22} color={C.amber} />
          <div>
            <div style={{ fontFamily: bnSans, fontWeight: 800, color: C.amber, fontSize: 17 }}>সুবর্ণ জয়ন্তী ২০২৬</div>
            <div style={{ fontFamily: sans, color: "#d1fae5", fontSize: 11.5 }}>Around 26 December 2026 · School campus</div>
          </div>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 8, borderRadius: 16, border: `3px solid rgba(16,185,129,${0.3 + 0.5 * pulse})` }}>
            <FakeQr size={190} t={0} />
          </div>
          <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, color: C.slate900 }}>Jashedul Islam Shaun</div>
          <div style={{ fontFamily: bnSans, fontSize: 14, color: C.slate700, marginTop: -6 }}>জাশেদুল ইসলাম শাওন · SSC 2013</div>
          <div style={{ fontFamily: sans, fontSize: 12, color: C.slate500 }}>2 people · T-shirt L · Show this QR at the gate</div>
        </div>
      </div>
      {gate && (
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: 300,
            padding: "18px 16px",
            borderRadius: 20,
            background: "#059669",
            color: "white",
            textAlign: "center",
            boxShadow: "0 16px 34px rgba(0,0,0,0.3)",
            transform: `scale(${interpolate(t, [GATE_AT, GATE_AT + 0.25], [0.6, 1], { extrapolateRight: "clamp" })})`,
            opacity: interpolate(t, [GATE_AT, GATE_AT + 0.2], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Check size={44} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: bnSans, fontWeight: 800, fontSize: 20 }}>গেটে চেক-ইন সম্পন্ন</div>
          <div style={{ fontFamily: sans, fontSize: 12.5 }}>Checked in · Welcome back!</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The bottom sheet a phone shows for a select menu. */
const SelectSheet: React.FC<{ t: number }> = ({ t }) => {
  const s = sheetAt(t);
  if (!s) return null;
  const local = t - s.t;
  const shown = interpolate(local, [0.05, 0.25, 0.75, 0.95], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const picked = local >= 0.6;
  const sheetH = s.options.length * 52 + 24 + 44;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `rgba(15,23,42,${0.35 * shown})` }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: VH - sheetH,
          height: sheetH,
          background: "white",
          borderRadius: "20px 20px 0 0",
          transform: `translateY(${(1 - shown) * sheetH}px)`,
          fontFamily: bnSans,
        }}
      >
        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 20px", fontFamily: sans, fontWeight: 700, fontSize: 13, color: C.slate500 }}>{s.title}</div>
        {s.options.map((o, i) => (
          <div
            key={o}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: sheetOptionY(s.options.length, i) - 26 - (VH - sheetH),
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              fontSize: 15.5,
              color: C.slate900,
              background: picked && i === s.pick ? C.emerald50 : "transparent",
              fontWeight: picked && i === s.pick ? 700 : 400,
            }}
          >
            {o}
            <span style={{ width: 20, height: 20, borderRadius: 999, border: `2px solid ${picked && i === s.pick ? "#059669" : C.slate300}`, background: picked && i === s.pick ? "#059669" : "white" }} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Finger: React.FC<{ t: number }> = ({ t }) => {
  const f = fingerAt(t);
  if (!f) return null;
  return (
    <>
      {f.ripple !== null && (
        <div
          style={{
            position: "absolute",
            left: f.x - 30,
            top: f.y - 30,
            width: 60,
            height: 60,
            borderRadius: 999,
            border: "3px solid rgba(16,185,129,0.9)",
            transform: `scale(${0.4 + f.ripple * 1.2})`,
            opacity: 1 - f.ripple,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: f.x - 20,
          top: f.y - 20,
          width: 40,
          height: 40,
          borderRadius: 999,
          background: "rgba(15,23,42,0.28)",
          border: "2.5px solid rgba(255,255,255,0.95)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
          transform: `scale(${1 - f.press * 0.25})`,
        }}
      />
    </>
  );
};

const AddressBar: React.FC<{ t: number }> = ({ t }) => {
  const url = typedAt("url", t, t >= LANDING_AT ? "exsabujian.org/jubilee" : "");
  const typing = t < LANDING_AT && url.length > 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: "#f1f5f9", borderBottom: `1px solid ${C.slate200}`, display: "flex", alignItems: "center", padding: "0 10px" }}>
      <div style={{ flex: 1, height: 38, borderRadius: 999, background: "white", border: `1.5px solid ${typing ? "#10b981" : C.slate200}`, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", fontFamily: sans, fontSize: 14.5, color: C.slate900 }}>
        <Lock size={13} color={url ? C.slate500 : C.slate300} />
        <span style={{ color: url ? C.slate900 : C.slate400 }}>{url || "Search or type web address"}</span>
        {typing && <Caret t={t} />}
      </div>
    </div>
  );
};

/** Everything inside the phone's screen at time `t` (seconds of the video). */
export const PhoneScreen: React.FC<{ t: number }> = ({ t }) => {
  const screen = screenAt(t);
  const scroll = scrollAt(screen, t);
  const switchedAt = { newtab: 0, landing: LANDING_AT, step1: STEP1_AT, step2: STEP2_AT, review: REVIEW_AT, ticket: TICKET_AT }[screen];
  const enter = interpolate(t - switchedAt, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const page =
    screen === "newtab" ? <NewTab /> : screen === "landing" ? <Landing t={t} /> : screen === "step1" ? <Step1 t={t} /> : screen === "step2" ? <Step2 t={t} /> : screen === "review" ? <Review t={t} /> : <TicketScreen t={t} />;
  return (
    <div style={{ position: "relative", width: VW, height: VH, overflow: "hidden", background: "white" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: BAR, height: CH, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${-scroll + (1 - enter) * 30}px)`, opacity: 0.3 + 0.7 * enter, height: "100%" }}>{page}</div>
      </div>
      <AddressBar t={t} />
      <SelectSheet t={t} />
      <Finger t={t} />
    </div>
  );
};
