import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Check } from "lucide-react";
import { colors, fonts, goldText } from "../theme";
import { Background, useVertical } from "../ui";
import { PhoneScreen } from "./Phone";
import {
  CAPTIONS,
  DURATION_S,
  EMAIL_AT,
  END_AT,
  GATE_AT,
  LANDING_AT,
  PHOTO_AT,
  PROOF_AT,
  PROOF_NOTE_AT,
  QR_AT,
  QR_SCAN_AT,
  REVIEW_AT,
  Scene,
  sceneStart,
  sheets,
  SHOT_AT,
  SPOUSE_AT,
  STEP1_AT,
  STEP2_AT,
  TICKET_AT,
  TOTAL_AT,
  typing,
  VH,
  VO_OFFSET,
  VW,
} from "./timeline";

export const FPS = 30;
export const FORM_DURATION_FRAMES = DURATION_S * FPS;

/** When a typed or picked field is finished. */
const done = (id: string) => {
  const k = typing[id];
  if (k) return k.t0 + k.dur;
  const s = sheets.find((x) => x.field === id);
  return s ? s.t + 0.65 : 0;
};

type Panel = { chip: string; bn: string; en: string; items: { bn: string; at: number }[] };
const PANELS: Partial<Record<Scene, Panel>> = {
  open: { chip: "শুরু", bn: "ওয়েবসাইট খুলুন", en: "Open the website", items: [{ bn: "exsabujian.org/jubilee", at: LANDING_AT }, { bn: "\"রেজিস্ট্রেশন করুন\" চাপুন", at: STEP1_AT }] },
  details: { chip: "ধাপ ১ / ২", bn: "ছবি ও নাম", en: "Photo & name", items: [{ bn: "মুখের পরিষ্কার ছবি", at: PHOTO_AT }, { bn: "ইংরেজিতে পুরো নাম", at: done("nameEn") }, { bn: "বাংলায় পুরো নাম", at: done("nameBn") }] },
  contact: { chip: "ধাপ ১ / ২", bn: "যোগাযোগের তথ্য", en: "Contact details", items: [{ bn: "ইমেইল", at: done("email") }, { bn: "পাসওয়ার্ড (৮+ অক্ষর)", at: done("password") }, { bn: "মোবাইল নম্বর", at: done("phone") }] },
  profile: {
    chip: "ধাপ ১ / ২",
    bn: "ব্যক্তিগত তথ্য",
    en: "Personal details",
    items: [
      { bn: "এসএসসি ব্যাচ", at: done("batch") },
      { bn: "বিভাগ", at: done("group") },
      { bn: "লিঙ্গ", at: done("gender") },
      { bn: "জন্ম তারিখ", at: done("dob") },
      { bn: "পেশা ও ঠিকানা (ঐচ্ছিক)", at: done("address") },
    ],
  },
  proof: { chip: "ধাপ ১ / ২", bn: "স্কুলে পড়ার প্রমাণ", en: "Proof of study", items: [{ bn: "ডকুমেন্টের ধরন", at: done("proofType") }, { bn: "সনদ/মার্কশিটের ছবি", at: PROOF_AT }, { bn: "শুধু কমিটি দেখবে", at: PROOF_NOTE_AT }] },
  continue: { chip: "ধাপ ১ / ২", bn: "পরের ধাপে যান", en: "Next step", items: [{ bn: "\"Continue\" চাপুন", at: STEP2_AT }] },
  step2: { chip: "ধাপ ২ / ২", bn: "অতিথি ও টি-শার্ট", en: "Guests & T-shirt", items: [{ bn: "সাথে কে আসছেন", at: done("guestName") || SPOUSE_AT }, { bn: "টি-শার্টের সাইজ", at: done("tshirt") }, { bn: "মোট টাকা নিজেই হিসাব", at: TOTAL_AT }] },
  pay: { chip: "ধাপ ২ / ২", bn: "পেমেন্ট করুন", en: "Pay", items: [{ bn: "বাংলা কিউআর বেছে নিন", at: QR_AT }, { bn: "অ্যাপে স্ক্যান করে পেমেন্ট", at: QR_SCAN_AT + 1.2 }] },
  paydetails: { chip: "ধাপ ২ / ২", bn: "পেমেন্টের তথ্য", en: "Payment details", items: [{ bn: "নম্বরের শেষ ৪ অঙ্ক", at: done("last4") }, { bn: "পেমেন্টের সময়", at: done("paidAt") }, { bn: "রসিদের স্ক্রিনশট", at: SHOT_AT }] },
  submit: { chip: "ধাপ ২ / ২", bn: "জমা দিন", en: "Submit", items: [{ bn: "\"Join & Register\" চাপুন", at: REVIEW_AT }] },
  ticket: { chip: "শেষ", bn: "টিকিট পান", en: "Get your ticket", items: [{ bn: "ইমেইলে টিকিট", at: EMAIL_AT + 0.4 }, { bn: "ড্যাশবোর্ডে কিউআর কোড", at: TICKET_AT + 0.4 }, { bn: "গেটে কোড দেখান", at: GATE_AT + 0.3 }] },
};
const ORDER: Scene[] = ["open", "details", "contact", "profile", "proof", "continue", "step2", "pay", "paydetails", "submit", "ticket"];

const panelAt = (t: number) => {
  let cur: Scene | null = null;
  for (const s of ORDER) if (t >= sceneStart(s) - 0.15) cur = s;
  return cur;
};

const PhoneFrame: React.FC<{ t: number; scale: number }> = ({ t, scale }) => {
  const bezel = 14;
  return (
    <div
      style={{
        width: (VW + bezel * 2) * scale,
        height: (VH + bezel * 2 + 28) * scale,
        borderRadius: 54 * scale,
        background: "linear-gradient(160deg, #1f2937, #0b0f14)",
        boxShadow: `0 ${30 * scale}px ${70 * scale}px rgba(0,0,0,0.55), inset 0 0 0 ${2 * scale}px rgba(255,255,255,0.08)`,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", left: bezel * scale, top: (bezel + 22) * scale, width: VW * scale, height: VH * scale, borderRadius: 30 * scale, overflow: "hidden" }}>
        <div style={{ width: VW, height: VH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <PhoneScreen t={t} />
        </div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: 14 * scale, width: 90 * scale, height: 14 * scale, marginLeft: -45 * scale, borderRadius: 99, background: "#05070a" }} />
    </div>
  );
};

const ChecklistPanel: React.FC<{ t: number; vertical: boolean }> = ({ t, vertical }) => {
  const { fps } = useVideoConfig();
  const scene = panelAt(t);
  if (!scene) return null;
  const p = PANELS[scene]!;
  const local = t - sceneStart(scene);
  const inP = spring({ frame: local * fps + 5, fps, config: { damping: 18, stiffness: 140 } });
  return (
    <div style={{ opacity: inP, transform: `translateY(${(1 - inP) * 24}px)`, textAlign: vertical ? "center" : "left" }}>
      <div style={{ display: "inline-block", fontFamily: fonts.bn, fontWeight: 700, fontSize: vertical ? 34 : 30, color: colors.green, background: colors.gold, borderRadius: 999, padding: "4px 22px" }}>{p.chip}</div>
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: vertical ? 72 : 76, lineHeight: 1.25, marginTop: 12, ...goldText }}>{p.bn}</div>
      <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: vertical ? 30 : 30, color: colors.mint, marginTop: 2 }}>{p.en}</div>
      {!vertical && (
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 18 }}>
          {p.items.map((it, i) => {
            const ok = t >= it.at;
            const show = spring({ frame: (local - 0.15 - i * 0.12) * fps, fps, config: { damping: 18 } });
            const pop = ok ? spring({ frame: (t - it.at) * fps, fps, config: { damping: 9, stiffness: 180 } }) : 0;
            return (
              <div key={it.bn} style={{ display: "flex", alignItems: "center", gap: 18, opacity: show, transform: `translateX(${(1 - show) * 30}px)` }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    border: `3px solid ${ok ? colors.gold : "rgba(228,194,122,0.4)"}`,
                    background: ok ? colors.gold : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${1 + 0.25 * Math.sin(pop * Math.PI)})`,
                    flexShrink: 0,
                  }}
                >
                  {ok && <Check size={28} color={colors.green} strokeWidth={3.5} />}
                </div>
                <span style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: 40, color: ok ? colors.cream : "rgba(246,239,224,0.6)" }}>{it.bn}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Subtitle: React.FC<{ t: number; vertical: boolean }> = ({ t, vertical }) => {
  const cap = CAPTIONS.find((c) => t >= c.from && t < c.to);
  if (!cap) return null;
  const o = interpolate(t, [cap.from, cap.from + 0.2, cap.to - 0.15, cap.to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity: o,
        padding: vertical ? "14px 26px" : "12px 24px",
        borderRadius: 14,
        background: "rgba(2, 18, 12, 0.65)",
        color: colors.cream,
        fontFamily: fonts.en,
        fontWeight: 500,
        fontSize: vertical ? 36 : 30,
        lineHeight: 1.3,
        textAlign: "center",
      }}
    >
      {cap.text}
    </div>
  );
};

const IntroCard: React.FC<{ t: number; vertical: boolean }> = ({ t, vertical }) => {
  const { fps } = useVideoConfig();
  const out = interpolate(t, [sceneStart("open") - 0.5, sceneStart("open")], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = (d: number) => spring({ frame: (t - d) * fps, fps, config: { damping: 16 } });
  if (out <= 0) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: vertical ? 30 : 20, opacity: out, paddingBottom: vertical ? 200 : 120, textAlign: "center" }}>
      <div style={{ transform: `scale(${s(0.1)})`, width: vertical ? 230 : 190, height: vertical ? 230 : 190, borderRadius: 40, background: "white", padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
        <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <div style={{ opacity: s(0.5), fontFamily: fonts.bn, fontWeight: 600, fontSize: vertical ? 44 : 38, color: colors.mint }}>সুবর্ণ জয়ন্তী ২০২৬</div>
      <div style={{ opacity: s(0.8), transform: `translateY(${(1 - s(0.8)) * 30}px)`, fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: vertical ? 120 : 120, lineHeight: 1.2, ...goldText }}>রেজিস্ট্রেশন গাইড</div>
      <div style={{ opacity: s(1.3), fontFamily: fonts.en, fontWeight: 500, fontSize: vertical ? 36 : 34, color: colors.cream, letterSpacing: "0.08em" }}>How to register, step by step</div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ t: number; vertical: boolean }> = ({ t, vertical }) => {
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: (t - END_AT - d) * fps, fps, config: { damping: 16 } });
  if (t < END_AT) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: vertical ? 34 : 24, paddingBottom: vertical ? 260 : 130, textAlign: "center" }}>
      <div style={{ opacity: s(0), fontFamily: fonts.bn, fontWeight: 600, fontSize: vertical ? 48 : 42, color: colors.mint }}>রেজিস্ট্রেশন চলবে</div>
      <div style={{ transform: `scale(${s(0.15)})`, fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: vertical ? 130 : 130, lineHeight: 1.15, ...goldText }}>৩০ নভেম্বর পর্যন্ত</div>
      <div style={{ opacity: s(0.6), fontFamily: fonts.en, fontWeight: 600, fontSize: vertical ? 52 : 52, color: colors.green, background: `linear-gradient(180deg, #f3dca0, ${colors.gold})`, borderRadius: 999, padding: "16px 50px" }}>exsabujian.org/jubilee</div>
      <div style={{ opacity: s(3.0), fontFamily: fonts.en, fontSize: vertical ? 38 : 36, color: colors.cream }}>Questions? info@exsabujian.org</div>
    </AbsoluteFill>
  );
};

export const FormGuide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const vertical = useVertical();
  const t = frame / fps;
  const phoneIn = spring({ frame: (t - (sceneStart("open") - 0.4)) * fps, fps, config: { damping: 18, stiffness: 90 } });
  const phoneOut = interpolate(t, [END_AT - 0.2, END_AT + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endFade = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = vertical ? 1.6 : 1.3;
  const shift = (1 - phoneIn) * (vertical ? 2000 : 1300) + phoneOut * (vertical ? 2000 : 1300);
  const panelOpacity = phoneIn * (1 - phoneOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: endFade }}>
        <Background />
        <IntroCard t={t} vertical={vertical} />
        {vertical ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 70, opacity: panelOpacity }}>
              <ChecklistPanel t={t} vertical />
            </div>
            <div style={{ position: "absolute", left: (1080 - (VW + 28) * scale) / 2, top: 300, transform: `translateY(${shift}px)` }}>
              <PhoneFrame t={t} scale={scale} />
            </div>
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: 250, top: (1080 - (VH + 56) * scale) / 2, transform: `translateY(${shift}px)` }}>
              <PhoneFrame t={t} scale={scale} />
            </div>
            <div style={{ position: "absolute", left: 960, right: 120, top: 170, opacity: panelOpacity }}>
              <ChecklistPanel t={t} vertical={false} />
            </div>
          </>
        )}
        <EndCard t={t} vertical={vertical} />
        <div
          style={
            vertical
              ? { position: "absolute", left: 50, right: 50, bottom: 70 }
              : t < sceneStart("open") || t >= END_AT
                ? { position: "absolute", left: 360, right: 360, bottom: 60 }
                : { position: "absolute", left: 930, right: 90, bottom: 60 }
          }
        >
          <Subtitle t={t} vertical={vertical} />
        </div>
      </AbsoluteFill>
      <Sequence from={Math.round(VO_OFFSET * fps)} name="voiceover">
        <Audio src={staticFile("form/voiceover.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
