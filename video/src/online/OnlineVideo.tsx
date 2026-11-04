import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import {
  ArrowRight,
  Banknote,
  BadgeCheck,
  CheckCircle2,
  Clock,
  EyeOff,
  FileText,
  Hourglass,
  House,
  LayoutDashboard,
  Lock,
  Mail,
  PenLine,
  Phone,
  QrCode,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Timer,
  Users,
} from "lucide-react";
import timings from "./timings.json";
import { colors, fonts, goldText } from "../theme";
import { Background, useVertical } from "../ui";

export const FPS = 30;
const VO_OFFSET = 0.5;
export const ONLINE_DURATION_FRAMES = Math.ceil(timings.voEnd + VO_OFFSET + 3) * FPS;

type Scene = "intro" | "offline" | "online" | "pay" | "track" | "member" | "privacy" | "women" | "settings" | "cta";
const ORDER: Scene[] = ["intro", "offline", "online", "pay", "track", "member", "privacy", "women", "settings", "cta"];
const start = (s: Scene) => (s === "intro" ? 0 : (timings.scenes as Record<Scene, number>)[s] + VO_OFFSET);
/** Seconds into `scene` at which the voiceover says its cue word `i` (0 = its first word). */
const cue = (s: Scene, i: number, lead = 0.1) => Math.max(0, (timings.cues as Record<Scene, number[]>)[s][i] + VO_OFFSET - start(s) - lead);
const endOf = (s: Scene) => {
  const i = ORDER.indexOf(s);
  return i + 1 < ORDER.length ? start(ORDER[i + 1]) : timings.voEnd + VO_OFFSET + 3;
};

const RED = "#f87171";

/** Springs in `delay` seconds after the scene starts (local time `t`). */
const usePop = (t: number, delay: number, damping = 14) => {
  const { fps } = useVideoConfig();
  return spring({ frame: (t - delay) * fps, fps, config: { damping, stiffness: 130 } });
};

const Pop: React.FC<{ t: number; delay: number; children: React.ReactNode; style?: React.CSSProperties; scale?: boolean }> = ({ t, delay, children, style, scale }) => {
  const p = usePop(t, delay);
  return <div style={{ opacity: Math.min(1, p * 1.5), transform: scale ? `scale(${interpolate(p, [0, 1], [0.6, 1])})` : `translateY(${interpolate(p, [0, 1], [36, 0])}px)`, ...style }}>{children}</div>;
};

const Heading: React.FC<{ t: number; bn: string; en?: string; delay?: number }> = ({ t, bn, en, delay = 0 }) => {
  const v = useVertical();
  return (
    <Pop t={t} delay={delay} style={{ textAlign: "center" }}>
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 84 : 74, lineHeight: 1.25, ...goldText }}>{bn}</div>
      {en && <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 32 : 28, color: colors.mint, marginTop: 4 }}>{en}</div>}
    </Pop>
  );
};

const IconTile: React.FC<{ t: number; delay: number; icon: React.ElementType; bn: string; tone?: "good" | "bad"; size?: number }> = ({ t, delay, icon: Icon, bn, tone = "good", size }) => {
  const v = useVertical();
  const w = size ?? (v ? 420 : 360);
  const bad = tone === "bad";
  return (
    <Pop t={t} delay={delay} scale>
      <div
        style={{
          width: w,
          padding: v ? "26px 20px" : "22px 18px",
          borderRadius: 28,
          background: bad ? "rgba(248,113,113,0.08)" : "rgba(255,255,255,0.07)",
          border: `1.5px solid ${bad ? "rgba(248,113,113,0.45)" : "rgba(228,194,122,0.4)"}`,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div style={{ width: v ? 84 : 74, height: v ? 84 : 74, borderRadius: 22, background: bad ? "rgba(248,113,113,0.15)" : "rgba(228,194,122,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={v ? 48 : 42} color={bad ? RED : colors.gold} strokeWidth={1.7} />
        </div>
        <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 44 : 38, color: colors.cream, lineHeight: 1.25, textAlign: "left" }}>{bn}</div>
      </div>
    </Pop>
  );
};

const Column: React.FC<{ title: string; tone: "good" | "bad"; dim: number; children: React.ReactNode; t: number; delay: number }> = ({ title, tone, dim, children, t, delay }) => {
  const v = useVertical();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: v ? 18 : 18, opacity: 1 - dim * 0.55, transform: `scale(${1 - dim * 0.06})` }}>
      <Pop t={t} delay={delay}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 70 : 64, color: tone === "bad" ? RED : undefined, ...(tone === "good" ? goldText : {}) }}>{title}</div>
      </Pop>
      {children}
    </div>
  );
};

/* 2 + 3 · Offline vs online, side by side (stacked on 9:16). */
const Compare: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const onlineAt = start("online") - start("offline");
  const offT = t;
  const onT = t - onlineAt;
  const dimOff = interpolate(t, [onlineAt, onlineAt + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tile = v ? 500 : 620;
  return (
    <AbsoluteFill style={{ justifyContent: "center", flexDirection: "row", alignItems: "flex-start", paddingTop: v ? 480 : 190, gap: v ? 24 : 80, paddingBottom: v ? 300 : 130 }}>
      <Column title="অফলাইন" tone="bad" dim={dimOff} t={offT} delay={0}>
        <IconTile t={offT} delay={cue("offline", 1)} icon={FileText} bn="কাগজের ফর্ম" tone="bad" size={tile} />
        <IconTile t={offT} delay={cue("offline", 2)} icon={Search} bn="কমিটির কাউকে খোঁজা" tone="bad" size={tile} />
        <IconTile t={offT} delay={cue("offline", 3)} icon={Banknote} bn="হাতে হাতে টাকা" tone="bad" size={tile} />
        <IconTile t={offT} delay={cue("offline", 4)} icon={Hourglass} bn="তারপর অপেক্ষা…" tone="bad" size={tile} />
      </Column>
      {t >= onlineAt - 0.2 && (
        <Column title="অনলাইন" tone="good" dim={0} t={onT} delay={0}>
          <IconTile t={onT} delay={cue("online", 1)} icon={House} bn="ঘরে বসেই" size={tile} />
          <IconTile t={onT} delay={cue("online", 2)} icon={Clock} bn="যেকোনো সময়" size={tile} />
          <IconTile t={onT} delay={cue("online", 3)} icon={Timer} bn="মাত্র কয়েক মিনিটে" size={tile} />
          <IconTile t={onT} delay={cue("online", 3) + 0.8} icon={Smartphone} bn="ফোন থেকেই" size={tile} />
        </Column>
      )}
    </AbsoluteFill>
  );
};

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 30 }) => {
  const v = useVertical();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, paddingBottom: v ? 300 : 130, paddingLeft: 60, paddingRight: 60 }}>{children}</AbsoluteFill>
  );
};

const Intro: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const swing = Math.sin(t * 2.4) * 6;
  return (
    <Center gap={v ? 50 : 34}>
      <div style={{ display: "flex", alignItems: "center", gap: v ? 40 : 60 }}>
        <Pop t={t} delay={0.1} scale>
          <div style={{ transform: `rotate(${-8 + swing * 0.3}deg)`, width: v ? 230 : 200, height: v ? 290 : 250, borderRadius: 18, background: "#f1ede2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
            <FileText size={v ? 130 : 110} color="#9ca3af" strokeWidth={1.3} />
          </div>
        </Pop>
        <Pop t={t} delay={0.4} scale>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: v ? 90 : 80, color: colors.cream }}>vs</div>
        </Pop>
        <Pop t={t} delay={0.7} scale>
          <div style={{ transform: `rotate(${8 - swing * 0.3}deg)`, width: v ? 190 : 165, height: v ? 330 : 290, borderRadius: 34, background: "linear-gradient(160deg,#1f2937,#0b0f14)", padding: 10, boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 24, background: colors.greenMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={staticFile("logo-large.webp")} style={{ width: "70%", borderRadius: 999, background: "white" }} />
            </div>
          </div>
        </Pop>
      </div>
      <Heading t={t} delay={1.0} bn="অনলাইন কেন ভালো?" en="Why register online?" />
    </Center>
  );
};

const PayScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const scan = ((t * 1.2) % 1) * 100;
  return (
    <Center gap={v ? 44 : 30}>
      <Pop t={t} delay={0} scale>
        <div style={{ position: "relative", width: v ? 300 : 250, height: v ? 300 : 250, borderRadius: 32, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 18px 44px rgba(0,0,0,0.45)", overflow: "hidden" }}>
          <QrCode size={v ? 230 : 190} color="#0f172a" strokeWidth={1.4} />
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scan}%`, height: 5, background: "#10b981", opacity: 0.85 }} />
        </div>
      </Pop>
      <Heading t={t} delay={0.3} bn="বাংলা কিউআর পেমেন্ট" en="Pay with Bangla QR" />
      <div style={{ display: "flex", flexDirection: v ? "column" : "row", gap: 24 }}>
        <IconTile t={t} delay={cue("pay", 1)} icon={PenLine} bn="নিজের তথ্য নিজেই লেখেন" size={v ? 860 : 560} />
        <IconTile t={t} delay={cue("pay", 2)} icon={CheckCircle2} bn="ভুলের সুযোগ কম" size={v ? 860 : 440} />
      </div>
    </Center>
  );
};

const TrackScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const steps: [React.ElementType, string, string, number][] = [
    [LayoutDashboard, "আবেদনের অবস্থা", "Dashboard", 0],
    [Mail, "ইমেইলে টিকিট", "Ticket by email", cue("track", 2)],
    [ScanLine, "গেটে কিউআর", "QR at the gate", cue("track", 3)],
  ];
  return (
    <Center gap={v ? 40 : 50}>
      <Heading t={t} bn="সব কিছু আপনার ফোনে" en="Everything on your phone" />
      <div style={{ display: "flex", flexDirection: v ? "column" : "row", alignItems: "center", gap: v ? 18 : 26 }}>
        {steps.map(([Icon, bnText, en, at], i) => (
          <React.Fragment key={en}>
            {i > 0 && (
              <Pop t={t} delay={at - 0.2} scale>
                <ArrowRight size={v ? 54 : 60} color={colors.gold} style={{ transform: v ? "rotate(90deg)" : "none" }} />
              </Pop>
            )}
            <Pop t={t} delay={at} scale>
              <div style={{ width: v ? 520 : 380, padding: "30px 20px", borderRadius: 30, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(228,194,122,0.4)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Icon size={v ? 76 : 70} color={colors.gold} strokeWidth={1.6} />
                <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 46 : 42, color: colors.cream }}>{bnText}</div>
                <div style={{ fontFamily: fonts.en, fontSize: v ? 26 : 24, color: colors.mint }}>{en}</div>
              </div>
            </Pop>
          </React.Fragment>
        ))}
      </div>
    </Center>
  );
};

const MemberScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const shine = interpolate(t, [0.6, 1.8], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Center gap={v ? 44 : 30}>
      <Pop t={t} delay={0.05} scale>
        <div style={{ position: "relative", overflow: "hidden", width: v ? 820 : 720, height: v ? 480 : 420, borderRadius: 36, background: `linear-gradient(135deg, ${colors.greenLight}, ${colors.green})`, border: `3px solid ${colors.gold}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 36, padding: 44 }}>
          <div style={{ width: v ? 220 : 190, height: v ? 220 : 190, borderRadius: 30, background: "white", padding: 8, flexShrink: 0 }}>
            <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontFamily: fonts.en, fontSize: v ? 26 : 24, letterSpacing: "0.3em", color: colors.mint }}>MEMBER</div>
            <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 60 : 54, lineHeight: 1.25, ...goldText }}>প্রাক্তন সবুজিয়ান পরিষদ</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 38 : 34, color: colors.cream }}>
              <BadgeCheck size={v ? 44 : 40} color={colors.gold} /> সদস্যপদ
            </div>
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${shine}%`, width: "18%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", transform: "skewX(-20deg)" }} />
        </div>
      </Pop>
      <Pop t={t} delay={0.6}>
        <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 34 : 30, color: colors.mint }}>Registering also makes you a member</div>
      </Pop>
    </Center>
  );
};

const LockRow: React.FC<{ t: number; delay: number; icon: React.ElementType; label: string; masked: string }> = ({ t, delay, icon: Icon, label, masked }) => {
  const v = useVertical();
  const lock = usePop(t, delay + 0.5, 10);
  return (
    <Pop t={t} delay={delay}>
      <div style={{ width: v ? 880 : 900, display: "flex", alignItems: "center", gap: 22, padding: "22px 30px", borderRadius: 26, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(228,194,122,0.4)" }}>
        <Icon size={v ? 50 : 46} color={colors.gold} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 42 : 40, color: colors.cream }}>{label}</div>
          <div style={{ fontFamily: fonts.en, fontSize: v ? 30 : 28, color: colors.mint, letterSpacing: "0.1em" }}>{masked}</div>
        </div>
        <div style={{ transform: `scale(${lock})`, display: "flex", alignItems: "center", gap: 10, background: colors.gold, color: colors.green, borderRadius: 999, padding: "10px 22px", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 32 : 30 }}>
          <Lock size={v ? 30 : 28} /> শুধু কমিটি
        </div>
      </div>
    </Pop>
  );
};

const PrivacyScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const pulse = 1 + 0.04 * Math.sin(t * 4);
  return (
    <Center gap={v ? 34 : 26}>
      <Pop t={t} delay={0} scale>
        <ShieldCheck size={v ? 190 : 150} color={colors.gold} strokeWidth={1.3} style={{ transform: `scale(${pulse})` }} />
      </Pop>
      <Heading t={t} delay={0.2} bn="আপনার তথ্য সুরক্ষিত" en="Your details stay private" />
      <LockRow t={t} delay={cue("privacy", 1)} icon={Phone} label="মোবাইল নম্বর" masked="01••• ••••••" />
      <LockRow t={t} delay={cue("privacy", 1) + 0.6} icon={Mail} label="ইমেইল" masked="•••••@•••••.com" />
    </Center>
  );
};

/** An illustrated woman (not a real member) and, for others, the plain silhouette she becomes. */
const WomanArt: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 240 240">
    <rect width="240" height="240" fill="#fde7d4" />
    <path d="M40 240c4-52 38-82 80-82s76 30 80 82z" fill="#0f766e" />
    <path d="M58 120c0-48 26-80 62-80s62 32 62 80c0 30-10 52-22 64H80c-12-12-22-34-22-64z" fill="#7c2d12" />
    <circle cx="120" cy="112" r="40" fill="#f5c49c" />
    <path d="M80 104c4-30 22-44 40-44s36 14 40 44c-14-14-26-20-40-20s-26 6-40 20z" fill="#7c2d12" />
    <circle cx="106" cy="114" r="4" fill="#3f2a1d" />
    <circle cx="134" cy="114" r="4" fill="#3f2a1d" />
    <path d="M108 132c8 6 16 6 24 0" stroke="#b45309" strokeWidth="4" fill="none" strokeLinecap="round" />
  </svg>
);
const Silhouette: React.FC<{ size: number }> = ({ size }) => <Img src={staticFile("form/person.svg")} style={{ width: size, height: size, objectFit: "cover" }} />;

const ProfileCard: React.FC<{ t: number; delay: number; title: string; sub: string; hidden: boolean; morphAt?: number }> = ({ t, delay, title, sub, hidden, morphAt }) => {
  const v = useVertical();
  const size = v ? 300 : 280;
  const m = hidden && morphAt !== undefined ? interpolate(t, [morphAt, morphAt + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : hidden ? 1 : 0;
  return (
    <Pop t={t} delay={delay} scale>
      <div style={{ width: v ? 420 : 400, padding: 28, borderRadius: 32, background: "rgba(255,255,255,0.07)", border: `1.5px solid ${hidden ? "rgba(167,215,197,0.5)" : "rgba(228,194,122,0.6)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: size, height: size, borderRadius: 999, overflow: "hidden", border: `5px solid ${hidden ? colors.mint : colors.gold}` }}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - m, filter: `blur(${m * 14}px)` }}>
            <WomanArt size={size} />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: m }}>
            <Silhouette size={size} />
          </div>
          {hidden && m > 0.5 && (
            <div style={{ position: "absolute", right: 14, bottom: 14, width: 64, height: 64, borderRadius: 999, background: colors.green, display: "flex", alignItems: "center", justifyContent: "center", opacity: (m - 0.5) * 2 }}>
              <EyeOff size={34} color={colors.mint} />
            </div>
          )}
        </div>
        <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 42 : 38, color: colors.cream, textAlign: "center" }}>{title}</div>
        <div style={{ fontFamily: fonts.en, fontSize: v ? 26 : 24, color: colors.mint, textAlign: "center", marginTop: -8 }}>{sub}</div>
      </div>
    </Pop>
  );
};

const WomenScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const secondAt = cue("women", 3) - 0.2;
  const line = (
    <Pop t={t} delay={cue("women", 1) - 0.2}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 44 : 40, color: colors.cream }}>
        <EyeOff size={v ? 44 : 40} color={colors.mint} /> ছবি স্বয়ংক্রিয়ভাবে লুকানো থাকে
      </div>
    </Pop>
  );
  return (
    <Center gap={v ? 36 : 28}>
      <Heading t={t} bn="নারী সদস্যদের বিশেষ সুরক্ষা" en="Special protection for women" />
      <div style={{ display: "flex", flexDirection: v ? "column" : "row", gap: v ? 26 : 60, alignItems: "center" }}>
        <ProfileCard t={t} delay={cue("women", 1)} title="অন্যরা দেখেন" sub="Other members & visitors" hidden morphAt={cue("women", 2) + 0.2} />
        {(!v || t >= secondAt) && <ProfileCard t={t} delay={secondAt} title="আপনি ও কমিটি দেখেন" sub="You & the committee" hidden={false} />}
      </div>
      {(!v || t < secondAt) && line}
    </Center>
  );
};

const Toggle: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ width: 130, height: 70, borderRadius: 999, background: on > 0.5 ? "#10b981" : "rgba(255,255,255,0.2)", position: "relative", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 7, left: 7 + on * 60, width: 56, height: 56, borderRadius: 999, background: "white", boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }} />
  </div>
);

const SettingsScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const toggleAt = cue("settings", 1) + 0.6;
  const on = interpolate(t, [toggleAt, toggleAt + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w = v ? 880 : 900;
  return (
    <Center gap={v ? 34 : 28}>
      <Heading t={t} bn="সিদ্ধান্ত আপনার" en="Your choice" />
      <Pop t={t} delay={cue("settings", 1) - 0.2}>
        <div style={{ width: w, display: "flex", alignItems: "center", gap: 22, padding: "24px 30px", borderRadius: 26, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(228,194,122,0.4)" }}>
          <Settings size={v ? 50 : 46} color={colors.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 42 : 40, color: colors.cream }}>সেটিংস › ছবি দেখান</div>
            <div style={{ fontFamily: fonts.en, fontSize: v ? 28 : 26, color: colors.mint }}>Settings › Profile photo</div>
          </div>
          <Toggle on={on} />
        </div>
      </Pop>
      <Pop t={t} delay={cue("settings", 2)}>
        <div style={{ width: w, display: "flex", alignItems: "center", gap: 22, padding: "24px 30px", borderRadius: 26, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(228,194,122,0.4)" }}>
          <FileText size={v ? 50 : 46} color={colors.gold} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 42 : 40, color: colors.cream }}>এসএসসি সনদ / প্রমাণপত্র</div>
            <div style={{ fontFamily: fonts.en, fontSize: v ? 28 : 26, color: colors.mint }}>Proof of study</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: colors.gold, color: colors.green, borderRadius: 999, padding: "10px 22px", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 32 : 30 }}>
            <Users size={28} /> শুধু কমিটি
          </div>
        </div>
      </Pop>
    </Center>
  );
};

const CtaScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const pulse = (t % 1.4) / 1.4;
  return (
    <Center gap={v ? 40 : 28}>
      <Pop t={t} delay={0} scale>
        <div style={{ width: v ? 220 : 180, height: v ? 220 : 180, borderRadius: 40, background: "white", padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
          <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </Pop>
      <Heading t={t} delay={cue("cta", 1)} bn="আজই অনলাইনে রেজিস্ট্রেশন করুন" />
      <Pop t={t} delay={cue("cta", 2, 0.3)} scale>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `3px solid ${colors.gold}`, transform: `scale(${1 + pulse * 0.12}, ${1 + pulse * 0.4})`, opacity: 1 - pulse }} />
          <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 58 : 56, color: colors.green, background: `linear-gradient(180deg, #f3dca0, ${colors.gold})`, borderRadius: 999, padding: v ? "22px 54px" : "20px 60px" }}>exsabujian.org/jubilee</div>
        </div>
      </Pop>
      <Pop t={t} delay={cue("cta", 2) + 1}>
        <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 42 : 38, color: colors.cream }}>রেজিস্ট্রেশন চলবে ৩০ নভেম্বর পর্যন্ত</div>
      </Pop>
    </Center>
  );
};

const EN: Record<Scene, string> = {
  intro: "Why is registering online better? Let's see.",
  offline: "Offline, you fill in a paper form, find a committee member, hand over cash, and then wait.",
  online: "Online, you register from your phone, from home, any time, in a few minutes.",
  pay: "Pay with Bangla QR, and you type your own details, so there is less room for mistakes.",
  track: "Track your application on the dashboard. Once checked, your ticket comes by email, and you just show the QR code at the gate.",
  member: "You also become a member of Praktan Sabujian Parishad.",
  privacy: "Your privacy matters to us. Your mobile number and email are hidden by default; only the committee sees them.",
  women: "Special protection for women: their photos are hidden automatically. Others see only a plain avatar; only you and the committee see the real photo.",
  settings: "You can choose to show it later in Settings. And proofs like your SSC certificate are seen by the committee only.",
  cta: "So don't wait: register online today at exsabujian.org/jubilee.",
};

const Subtitle: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const s = timings.sentences.find((x) => t >= x.from + VO_OFFSET - 0.1 && t < (x.scene === "cta" ? timings.voEnd + 1.5 : x.to) + VO_OFFSET - 0.1);
  if (!s) return null;
  const from = s.from + VO_OFFSET - 0.1;
  const to = (s.scene === "cta" ? timings.voEnd + 1.5 : s.to) + VO_OFFSET - 0.1;
  const o = interpolate(t, [from, from + 0.2, to - 0.15, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: v ? 130 : 44 }}>
      <div style={{ opacity: o, maxWidth: v ? 960 : 1500, padding: v ? "14px 28px" : "10px 26px", borderRadius: 14, background: "rgba(2,18,12,0.62)", color: colors.cream, fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 38 : 32, lineHeight: 1.3, textAlign: "center" }}>
        {EN[s.scene as Scene]}
      </div>
    </AbsoluteFill>
  );
};

const RENDER: Partial<Record<Scene, React.FC<{ t: number }>>> = {
  intro: Intro,
  offline: Compare,
  pay: PayScene,
  track: TrackScene,
  member: MemberScene,
  privacy: PrivacyScene,
  women: WomenScene,
  settings: SettingsScene,
  cta: CtaScene,
};

export const OnlineVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const endFade = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: endFade }}>
        <Background />
        {ORDER.filter((s) => s !== "online").map((s) => {
          const C = RENDER[s]!;
          const from = start(s);
          // Offline and online share one split screen.
          const to = s === "offline" ? endOf("online") : endOf(s);
          if (t < from - 0.3 || t > to + 0.3) return null;
          const o = interpolate(t, [from - 0.3, from + 0.1, to - 0.2, to + 0.2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <AbsoluteFill key={s} style={{ opacity: s === "cta" ? Math.min(1, (t - from + 0.3) / 0.4) : o }}>
              <C t={t - from} />
            </AbsoluteFill>
          );
        })}
        <Subtitle t={t} />
      </AbsoluteFill>
      <Sequence from={Math.round(VO_OFFSET * fps)} name="voiceover">
        <Audio src={staticFile("online/voiceover.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
