import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Award,
  BookOpen,
  CalendarDays,
  Clock,
  Coffee,
  CookingPot,
  Flag,
  Gift,
  MapPin,
  Megaphone,
  Music,
  Shirt,
  Ticket,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { bn, colors, fonts, goldText } from "./theme";
import { Appear, GoldRule, useVertical } from "./ui";

/** Space kept free at the bottom for subtitles. */
const useSafeBottom = () => (useVertical() ? 300 : 130);

const Center: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 24, style }) => {
  const safe = useSafeBottom();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap,
        paddingBottom: safe,
        paddingLeft: 60,
        paddingRight: 60,
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* 1 · 1976: the emblem draws itself and the school's name appears. */
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const draw = interpolate(frame, [0, 2.2 * fps], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const R = 90;
  const C = 2 * Math.PI * R;
  const emblem = v ? 560 : 470;
  return (
    <Center gap={v ? 40 : 18}>
      <div style={{ position: "relative", width: emblem, height: emblem }}>
        <svg viewBox="-110 -110 220 220" width={emblem} height={emblem} style={{ position: "absolute", inset: 0 }}>
          <circle r={R} fill="none" stroke={colors.gold} strokeWidth={1.6} strokeDasharray={C} strokeDashoffset={C * (1 - draw)} transform="rotate(-90)" />
          {[80, 72, 64, 56].map((r, i) => (
            <circle key={r} r={r} fill="none" stroke={colors.gold} strokeOpacity={0.45} strokeWidth={0.5} strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - interpolate(draw, [0.15 + i * 0.1, 0.7 + i * 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))} transform="rotate(-90)" />
          ))}
          {new Array(60).fill(0).map((_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const show = interpolate(frame, [20 + i * 0.6, 26 + i * 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const long = i % 5 === 0;
            const r1 = 96;
            const r2 = long ? 104 : 100;
            return <line key={i} x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1} x2={Math.sin(a) * r2} y2={-Math.cos(a) * r2} stroke={colors.gold} strokeWidth={long ? 1 : 0.5} opacity={show * (long ? 0.9 : 0.5)} />;
          })}
        </svg>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <Appear delay={0.3} from="scale">
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: v ? 150 : 128, lineHeight: 1, ...goldText }}>1976</div>
          </Appear>
          <Appear delay={0.9}>
            <div style={{ fontFamily: fonts.en, fontSize: v ? 26 : 22, letterSpacing: "0.5em", color: colors.mint, marginTop: 10, paddingLeft: "0.5em" }}>SINCE</div>
          </Appear>
        </AbsoluteFill>
      </div>
      <Appear delay={1.6}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 76 : 66, color: colors.cream, lineHeight: 1.25 }}>সবুজ শিক্ষায়তন</div>
        <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 40 : 34, color: colors.mint, marginTop: 4 }}>সরকারি উচ্চ বিদ্যালয় · সীতাকুণ্ড, চট্টগ্রাম</div>
      </Appear>
    </Center>
  );
};

/* 2 · Fifty years on: the campus photo with a year counter. */
export const CampusScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const zoom = interpolate(frame, [0, duration], [1.08, 1.22]);
  const pan = interpolate(frame, [0, duration], v ? [6, -10] : [0, -3]);
  const year = Math.round(
    interpolate(frame, [0.4 * fps, 3.2 * fps], [1976, 2026], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }),
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile("school-campus.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom}) translateX(${pan}%)`, objectPosition: v ? "55% 50%" : "50% 50%" }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,40,30,0.55) 0%, rgba(6,40,30,0.05) 35%, rgba(6,40,30,0.35) 60%, rgba(3,22,16,0.95) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: v ? 180 : 70 }}>
        <Appear delay={0.2}>
          <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: v ? 150 : 120, lineHeight: 1, ...goldText, textShadow: "none" }}>{year}</div>
        </Appear>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: v ? 360 : 200, textAlign: "center" }}>
        <Appear delay={1.2}>
          <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 84 : 76, color: colors.cream, textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
            {bn(50)} বছরের স্মৃতি
          </div>
        </Appear>
        <Appear delay={1.8}>
          <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 42 : 36, color: colors.mint, marginTop: 6 }}>সেই মাঠ · সেই ক্লাসরুম</div>
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const TEACHERS = [
  "anwar-ali.jpg",
  "asm-iqbal-portrait.jpg",
  "nurjahan-akter-portrait.jpg",
  "tapan-kumar-majumder-portrait.jpg",
  "nantu-ranjan-das-portrait.jpg",
  "ranjit-chakraborty.jpg",
  "jalal-uddin-ahmed-2.jpg",
  "zaheda-akter-2.jpg",
  "abdul-halim-helali-2.jpg",
  "gita-das-gupta.jpg",
  "rakhal-chandra-nath.jpg",
  "kohinur-sultana.jpg",
];

/* 3 · Our teachers: a grid of portraits in gold frames. */
export const TeachersScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const cols = v ? 3 : 6;
  const list = v ? TEACHERS.slice(0, 9) : TEACHERS;
  const w = v ? 270 : 228;
  const h = Math.round(w * 1.25);
  const gap = v ? 26 : 22;
  return (
    <Center gap={v ? 50 : 34}>
      <Appear delay={0.1}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 70 : 60, ...goldText, lineHeight: 1.3 }}>শ্রদ্ধা, আমাদের শিক্ষকদের</div>
      </Appear>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${w}px)`, gap }}>
        {list.map((f, i) => {
          const p = spring({ frame: frame - (0.5 + i * 0.12) * fps, fps, config: { damping: 15, stiffness: 110 } });
          return (
            <div
              key={f}
              style={{
                width: w,
                height: h,
                borderRadius: 18,
                overflow: "hidden",
                border: `3px solid ${colors.gold}`,
                boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
                background: colors.greenMid,
              }}
            >
              <Img src={staticFile(`teachers/${f}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", filter: "sepia(0.15)" }} />
            </div>
          );
        })}
      </div>
    </Center>
  );
};

/* 4 · Golden Jubilee 2026, presented by Praktan Sabujian Parishad. */
export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const glow = 0.5 + 0.5 * Math.sin(frame / 12);
  const logo = v ? 340 : 250;
  const p = spring({ frame, fps, config: { damping: 12, stiffness: 90 } });
  return (
    <Center gap={v ? 34 : 18}>
      <div
        style={{
          width: logo,
          height: logo,
          borderRadius: logo * 0.18,
          background: "white",
          padding: 10,
          boxShadow: `0 0 ${40 + glow * 40}px rgba(228,194,122,${0.35 + glow * 0.25}), 0 20px 50px rgba(0,0,0,0.5)`,
          transform: `scale(${p}) rotate(${interpolate(p, [0, 1], [-8, 0])}deg)`,
          opacity: Math.min(1, p * 1.5),
        }}
      >
        <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <Appear delay={0.5}>
        <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 38 : 32, color: colors.mint }}>প্রাক্তন সবুজিয়ান পরিষদ আয়োজিত</div>
      </Appear>
      <Appear delay={1.6} from="scale">
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 112 : 118, lineHeight: 1.2, ...goldText }}>সুবর্ণ জয়ন্তী {bn(2026)}</div>
      </Appear>
      <Appear delay={2.2}>
        <div style={{ fontFamily: fonts.displayItalic, fontStyle: "italic", fontWeight: 600, fontSize: v ? 72 : 60, color: colors.cream, lineHeight: 1 }}>Golden Jubilee</div>
      </Appear>
      <GoldRule delay={2.6} width={v ? 320 : 260} />
      <Appear delay={2.8}>
        <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 34 : 28, letterSpacing: "0.4em", color: colors.gold, paddingLeft: "0.4em" }}>1976 — 2026</div>
      </Appear>
    </Center>
  );
};

const InfoCard: React.FC<{ icon: React.ReactNode; title: string; sub: string; delay: number }> = ({ icon, title, sub, delay }) => {
  const v = useVertical();
  return (
    <Appear delay={delay}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          width: v ? 880 : 1180,
          padding: v ? "30px 36px" : "26px 40px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.06)",
          border: "1.5px solid rgba(228,194,122,0.35)",
          textAlign: "left",
        }}
      >
        <div style={{ width: v ? 96 : 88, height: v ? 96 : 88, borderRadius: 24, background: "rgba(228,194,122,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 60 : 56, color: colors.cream, lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 30 : 28, color: colors.mint }}>{sub}</div>
        </div>
      </div>
    </Appear>
  );
};

/* 5 · When and where. Card timings follow the voiceover. */
export const DateScene: React.FC = () => {
  const v = useVertical();
  const s = v ? 54 : 50;
  return (
    <Center gap={v ? 30 : 22}>
      <InfoCard delay={0.05} icon={<CalendarDays size={s} color={colors.gold} />} title={`${bn(26)} ডিসেম্বর ${bn(2026)}`} sub="26 December 2026" />
      <InfoCard delay={1.15} icon={<Clock size={s} color={colors.gold} />} title={`সকাল ${bn(8)}টা – রাত ${bn(9)}টা`} sub="8:00 AM – 9:00 PM" />
      <InfoCard delay={3.2} icon={<MapPin size={s} color={colors.gold} />} title="স্কুল ক্যাম্পাস, সীতাকুণ্ড" sub="School campus · Sitakunda, Chattogram" />
    </Center>
  );
};

type Item = { icon: React.ElementType; bn: string; en: string; at: number };

const ItemGrid: React.FC<{ heading: string; items: Item[] }> = ({ heading, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const cols = v ? 2 : 3;
  const w = v ? 440 : 440;
  return (
    <Center gap={v ? 50 : 34}>
      <Appear delay={0}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 70 : 58, ...goldText, lineHeight: 1.3 }}>{heading}</div>
      </Appear>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${w}px)`, gap: v ? 26 : 24 }}>
        {items.map((it) => {
          const p = spring({ frame: frame - it.at * fps, fps, config: { damping: 13, stiffness: 140 } });
          const Icon = it.icon;
          return (
            <div
              key={it.en}
              style={{
                height: v ? 290 : 230,
                borderRadius: 28,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(228,194,122,0.35)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: Math.min(1, p * 1.4),
                transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`,
              }}
            >
              <Icon size={v ? 78 : 62} color={colors.gold} strokeWidth={1.6} />
              <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 48 : 42, color: colors.cream, lineHeight: 1.25 }}>{it.bn}</div>
              <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 28 : 24, color: colors.mint }}>{it.en}</div>
            </div>
          );
        })}
      </div>
    </Center>
  );
};

/* 6 · The programme. `at` = when the voiceover names it (scene seconds). */
export const ProgrammeScene: React.FC = () => (
  <ItemGrid
    heading="দিনভর আয়োজন"
    items={[
      { icon: Megaphone, bn: "জয়ন্তী র‍্যালি", en: "Jubilee rally", at: 0.05 },
      { icon: Flag, bn: "পতাকা উত্তোলন", en: "Flag hoisting", at: 1.1 },
      { icon: Award, bn: "শিক্ষক সম্মাননা", en: "Honouring teachers", at: 2.1 },
      { icon: Users, bn: "ব্যাচ রিইউনিয়ন", en: "Batch reunions", at: 3.35 },
      { icon: Music, bn: "সাংস্কৃতিক অনুষ্ঠান", en: "Cultural programme", at: 4.6 },
      { icon: Ticket, bn: "র‍্যাফেল ড্র", en: "Raffle draw", at: 6.0 },
    ]}
  />
);

/* 7 · What registration includes. */
export const KitScene: React.FC = () => (
  <ItemGrid
    heading="রেজিস্ট্রেশনে যা থাকছে"
    items={[
      { icon: Coffee, bn: "সকালের নাস্তা", en: "Breakfast", at: 0.8 },
      { icon: UtensilsCrossed, bn: "দুপুরের খাবার", en: "Lunch", at: 1.55 },
      { icon: CookingPot, bn: "বিরিয়ানি ডিনার", en: "Biryani dinner", at: 3.0 },
      { icon: Shirt, bn: "জয়ন্তী টি-শার্ট", en: "Jubilee T-shirt", at: 3.8 },
      { icon: BookOpen, bn: "স্মারকগ্রন্থ", en: "Souvenir book", at: 4.85 },
      { icon: Gift, bn: "স্মারক উপহার", en: "Commemorative gift", at: 6.0 },
    ]}
  />
);

const taka = (n: number) => `৳${bn(n.toLocaleString("en-US"))}`;

const FeeRow: React.FC<{ label: string; amount: number; delay: number }> = ({ label, amount, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const shown = Math.round(
    interpolate(frame - delay * fps, [0, 0.9 * fps], [0, amount], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) / 10,
  ) * 10;
  return (
    <Appear delay={delay}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          width: v ? 880 : 1000,
          padding: v ? "26px 40px" : "22px 44px",
          borderRadius: 26,
          background: "rgba(255,255,255,0.07)",
          border: "1.5px solid rgba(228,194,122,0.4)",
        }}
      >
        <span style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 44 : 42, color: colors.cream }}>{label}</span>
        <span style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 84 : 80, ...goldText, lineHeight: 1.1 }}>{taka(shown)}</span>
      </div>
    </Appear>
  );
};

/* 8 · Fees. */
export const FeesScene: React.FC = () => {
  const v = useVertical();
  const chip: React.CSSProperties = {
    fontFamily: fonts.bn,
    fontWeight: 600,
    fontSize: v ? 36 : 32,
    color: colors.green,
    background: colors.gold,
    borderRadius: 999,
    padding: "10px 28px",
  };
  return (
    <Center gap={v ? 28 : 20}>
      <Appear delay={0}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 70 : 58, ...goldText, lineHeight: 1.3, marginBottom: 6 }}>রেজিস্ট্রেশন ফি</div>
      </Appear>
      <FeeRow label={`ব্যাচ ${bn(2015)}–${bn(2026)}`} amount={1250} delay={0.55} />
      <FeeRow label={`ব্যাচ ${bn(1989)}–${bn(2014)}`} amount={1500} delay={2.2} />
      <Appear delay={4.2}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
          <span style={chip}>স্বামী/স্ত্রী +{taka(600)}</span>
          <span style={chip}>সন্তান ({bn(5)}+ বছর) +{taka(600)}</span>
        </div>
      </Appear>
    </Center>
  );
};

/* 9 · Deadline. */
export const DeadlineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const drop = spring({ frame: frame - 0.25 * fps, fps, config: { damping: 10, stiffness: 120 } });
  const size = v ? 380 : 330;
  return (
    <Center gap={v ? 34 : 22}>
      <Appear delay={0}>
        <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 50 : 44, color: colors.mint }}>রেজিস্ট্রেশনের শেষ সময়</div>
      </Appear>
      <div
        style={{
          width: size,
          borderRadius: 34,
          overflow: "hidden",
          background: colors.cream,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          transform: `translateY(${interpolate(drop, [0, 1], [-300, 0])}px) rotate(${interpolate(drop, [0, 1], [-10, -2])}deg)`,
          opacity: Math.min(1, drop * 2),
        }}
      >
        <div style={{ background: colors.goldDeep, color: "white", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 48 : 42, padding: "12px 0" }}>নভেম্বর</div>
        <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 200 : 176, color: colors.green, lineHeight: 1.15 }}>{bn(30)}</div>
      </div>
      <Appear delay={0.9}>
        <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 36 : 32, color: colors.cream }}>Closes 30 November 2026 · 11:59 PM</div>
      </Appear>
    </Center>
  );
};

/* 10 · Call to action. */
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const pulse = (frame % (1.4 * fps)) / (1.4 * fps);
  const logo = v ? 220 : 170;
  return (
    <Center gap={v ? 36 : 22}>
      <Appear delay={0} from="scale">
        <div style={{ width: logo, height: logo, borderRadius: logo * 0.2, background: "white", padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
          <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </Appear>
      <Appear delay={0.15}>
        <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 96 : 84, ...goldText, lineHeight: 1.25 }}>এখনই রেজিস্ট্রেশন করুন</div>
      </Appear>
      <Appear delay={1.1} from="scale">
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              border: `3px solid ${colors.gold}`,
              transform: `scale(${1 + pulse * 0.12}, ${1 + pulse * 0.4})`,
              opacity: 1 - pulse,
            }}
          />
          <div
            style={{
              fontFamily: fonts.en,
              fontWeight: 600,
              fontSize: v ? 58 : 56,
              color: colors.green,
              background: `linear-gradient(180deg, #f3dca0, ${colors.gold})`,
              borderRadius: 999,
              padding: v ? "22px 54px" : "20px 60px",
              boxShadow: "0 12px 34px rgba(0,0,0,0.4)",
            }}
          >
            exsabujian.org/jubilee
          </div>
        </div>
      </Appear>
      <Appear delay={4.45}>
        <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 50 : 44, color: colors.cream, lineHeight: 1.35, maxWidth: v ? 900 : 1400 }}>
          {bn(50)} বছরের উৎসবে দেখা হবে প্রিয় ক্যাম্পাসে
        </div>
      </Appear>
      <Appear delay={5.2}>
        <div style={{ fontFamily: fonts.en, fontSize: v ? 28 : 24, color: colors.mint }}>info@exsabujian.org · Praktan Sabujian Parishad</div>
      </Appear>
    </Center>
  );
};
