/** YouTube thumbnails (1280 × 720) for the deadline and souvenir videos. Rendered with `remotion still`. */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { colors, fonts, goldText } from "../theme";

const Base: React.FC<{ children: React.ReactNode; photo?: string }> = ({ children, photo }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 70% 40%, ${colors.greenLight} 0%, ${colors.green} 55%, #021710 100%)` }}>
    {photo && (
      <AbsoluteFill>
        <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, filter: "sepia(0.4)" }} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(3,26,19,0.98) 0%, rgba(3,26,19,0.85) 45%, rgba(3,26,19,0.35) 100%)" }} />
      </AbsoluteFill>
    )}
    <svg viewBox="-100 -100 200 200" width={1100} height={1100} style={{ position: "absolute", right: -280, top: -190, opacity: 0.35 }}>
      {new Array(10).fill(0).map((_, i) => (
        <circle key={i} r={20 + i * 8} fill="none" stroke={colors.gold} strokeWidth={i % 3 === 0 ? 0.5 : 0.2} />
      ))}
    </svg>
    <AbsoluteFill style={{ border: `6px solid ${colors.gold}`, margin: 18, borderRadius: 18, opacity: 0.85 }} />
    {children}
  </AbsoluteFill>
);

const Logo: React.FC<{ size?: number }> = ({ size = 120 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.22, background: "white", padding: 6, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
    <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </div>
);

const Calendar: React.FC<{ month: string; day: string }> = ({ month, day }) => (
  <div style={{ width: 330, borderRadius: 30, overflow: "hidden", background: colors.cream, boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 4px rgba(228,194,122,0.8)", textAlign: "center", transform: "rotate(4deg)" }}>
    <div style={{ background: `linear-gradient(180deg, ${colors.goldDeep}, #8a6420)`, color: "white", fontFamily: fonts.bn, fontWeight: 700, fontSize: 50, padding: "8px 0" }}>{month}</div>
    <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: 210, color: colors.green, lineHeight: 1.1 }}>{day}</div>
    <div style={{ fontFamily: fonts.en, fontWeight: 700, fontSize: 30, letterSpacing: "0.3em", color: colors.goldDeep, paddingBottom: 14, paddingLeft: "0.3em" }}>2026</div>
  </div>
);

export const DeadlineThumb: React.FC = () => (
  <Base photo="school-campus.jpg">
    <div style={{ position: "absolute", left: 70, top: 60, display: "flex", alignItems: "center", gap: 20 }}>
      <Logo size={104} />
      <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: 40, color: colors.mint }}>সুবর্ণ জয়ন্তী ২০২৬</div>
    </div>
    <div style={{ position: "absolute", left: 70, top: 210, width: 720 }}>
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: 92, lineHeight: 1.18, ...goldText }}>রেজিস্ট্রেশনের শেষ তারিখ</div>
      <div style={{ marginTop: 22, display: "inline-block", fontFamily: fonts.bn, fontWeight: 800, fontSize: 60, color: colors.green, background: colors.gold, borderRadius: 16, padding: "6px 30px" }}>আজই রেজিস্ট্রেশন করুন</div>
      <div style={{ marginTop: 26, fontFamily: fonts.en, fontWeight: 600, fontSize: 34, color: colors.cream, letterSpacing: "0.02em" }}>exsabujian.org/jubilee</div>
    </div>
    <div style={{ position: "absolute", right: 90, top: 150 }}>
      <Calendar month="নভেম্বর" day="৩০" />
    </div>
  </Base>
);

export const SouvenirThumb: React.FC = () => (
  <Base photo="souvenir/anwar-ali-speech-1.jpg">
    <div style={{ position: "absolute", left: 70, top: 60, display: "flex", alignItems: "center", gap: 20 }}>
      <Logo size={104} />
      <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: 40, color: colors.mint }}>সুবর্ণ জয়ন্তী স্মরণিকা</div>
    </div>
    <div style={{ position: "absolute", left: 70, top: 205, width: 760 }}>
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: 100, lineHeight: 1.15, ...goldText }}>আপনার লেখা পাঠান</div>
      <div style={{ marginTop: 14, fontFamily: fonts.bn, fontWeight: 700, fontSize: 46, color: colors.cream }}>স্মৃতিচারণ · গল্প · কবিতা · প্রবন্ধ</div>
      <div style={{ marginTop: 24, display: "inline-block", fontFamily: fonts.bn, fontWeight: 800, fontSize: 50, color: colors.green, background: colors.gold, borderRadius: 16, padding: "6px 28px" }}>শেষ তারিখ ৫ ডিসেম্বর</div>
    </div>
    <div style={{ position: "absolute", right: 100, top: 130, width: 300, height: 414, borderRadius: "6px 18px 18px 6px", background: `linear-gradient(135deg, #0d4a38, ${colors.green} 60%, #031a13)`, border: `3px solid ${colors.gold}`, boxShadow: "0 30px 70px rgba(0,0,0,0.65)", transform: "rotate(-5deg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
      <Logo size={110} />
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: 44, lineHeight: 1.2, ...goldText }}>
        সুবর্ণ জয়ন্তী
        <br />
        স্মরণিকা
      </div>
      <div style={{ fontFamily: fonts.en, fontSize: 20, letterSpacing: "0.3em", color: colors.gold }}>1976 — 2026</div>
    </div>
  </Base>
);
