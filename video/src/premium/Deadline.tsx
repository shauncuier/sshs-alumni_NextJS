import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Award, BookOpen, Gift, Lock, Megaphone, Music, Shirt, Users, UtensilsCrossed } from "lucide-react";
import timings from "../deadline/timings.json";
import { bn, colors, fonts, goldText } from "../theme";
import { Background, useVertical } from "../ui";
import { CalendarCard, Eyebrow, Finish, makeClock, Rise, Soundtrack, Stage, Sub, Subtitles, Timings, Title, UrlPill, useRise, VO_OFFSET } from "./kit";

const tm = timings as Timings;
const clock = makeClock(tm);
const { start, end, cue } = clock;
export const DEADLINE_DURATION_FRAMES = Math.ceil((tm.voEnd + VO_OFFSET + 3.2) * 30);

/* 1 · Fifty years: rings draw and the year counts up. */
const Intro: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const draw = interpolate(t, [0, 2.4], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const countFrom = cue("intro", 1);
  const year = Math.round(interpolate(t, [countFrom, countFrom + 1.8], [1976, 2026], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) }));
  const size = v ? 620 : 520;
  const R = 92;
  return (
    <Stage gap={v ? 40 : 26}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox="-110 -110 220 220" width={size} height={size} style={{ position: "absolute", inset: 0, transform: `rotate(${t * 3}deg)` }}>
          {[R, 82, 74, 66].map((r, i) => {
            const c = 2 * Math.PI * r;
            const d = interpolate(draw, [i * 0.12, 0.6 + i * 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <circle key={r} r={r} fill="none" stroke={colors.gold} strokeWidth={i === 0 ? 1.4 : 0.45} strokeOpacity={i === 0 ? 1 : 0.55} strokeDasharray={c} strokeDashoffset={c * (1 - d)} transform="rotate(-90)" />;
          })}
          {new Array(72).fill(0).map((_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const long = i % 6 === 0;
            const o = interpolate(t, [0.8 + i * 0.015, 1.1 + i * 0.015], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <line key={i} x1={Math.sin(a) * 97} y1={-Math.cos(a) * 97} x2={Math.sin(a) * (long ? 106 : 101)} y2={-Math.cos(a) * (long ? 106 : 101)} stroke={colors.gold} strokeWidth={long ? 0.9 : 0.4} opacity={o * (long ? 0.9 : 0.45)} />;
          })}
        </svg>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <Rise t={t} delay={0.3}>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: v ? 190 : 160, lineHeight: 1, ...goldText }}>{year}</div>
          </Rise>
          <Rise t={t} delay={0.8}>
            <div style={{ fontFamily: fonts.en, fontSize: v ? 28 : 24, letterSpacing: "0.55em", color: colors.mint, marginTop: 12, paddingLeft: "0.55em" }}>50 YEARS</div>
          </Rise>
        </AbsoluteFill>
      </div>
      <Title t={t} delay={0.5} size={v ? 74 : 64}>
        সবুজ শিক্ষায়তনের পঞ্চাশ বছর
      </Title>
      <Rise t={t} delay={1.2}>
        <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 34 : 30, letterSpacing: "0.45em", color: colors.cream, paddingLeft: "0.45em" }}>1976 — 2026</div>
      </Rise>
    </Stage>
  );
};

/* 2 · The day: the campus photo, slowly pushing in, with the title over it. */
const Event: React.FC<{ t: number; dur: number }> = ({ t, dur }) => {
  const v = useVertical();
  const zoom = interpolate(t, [0, dur + 1], [1.06, 1.18]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={staticFile("school-campus.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, objectPosition: v ? "56% 50%" : "50% 45%" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,26,19,0.75) 0%, rgba(4,26,19,0.2) 38%, rgba(4,26,19,0.55) 66%, rgba(2,16,11,0.97) 100%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", flexDirection: "column", gap: 14, paddingBottom: v ? 360 : 170 }}>
        <Eyebrow t={t} delay={0.1}>
          Golden Jubilee
        </Eyebrow>
        <Title t={t} delay={0.35} size={v ? 120 : 112}>
          সুবর্ণ জয়ন্তী {bn(2026)}
        </Title>
        <Sub t={t} delay={cue("event", 1)}>
          {bn(26)} ডিসেম্বর · স্কুল ক্যাম্পাস, সীতাকুণ্ড
        </Sub>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Item: React.FC<{ t: number; at: number; icon: React.ElementType; label: string }> = ({ t, at, icon: Icon, label }) => {
  const v = useVertical();
  const p = useRise(t, at);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 26}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: v ? 440 : 330 }}>
      <div style={{ width: v ? 150 : 104, height: v ? 150 : 104, borderRadius: 999, border: `1.5px solid ${colors.gold}`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(228,194,122,0.08)", boxShadow: `0 0 ${30 * p}px rgba(228,194,122,0.18)` }}>
        <Icon size={v ? 70 : 48} color={colors.gold} strokeWidth={1.4} />
      </div>
      <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 46 : 34, color: colors.cream, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
    </div>
  );
};

/* 3 · The day's programme, then what registration includes. */
const Programme: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const kitAt = cue("programme", 4);
  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: v ? "1fr 1fr" : "repeat(4, 1fr)", gap: v ? "36px 20px" : 20, justifyItems: "center" };
  const swap = interpolate(t, [kitAt - 0.5, kitAt], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage gap={v ? 50 : 40}>
      <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ opacity: 1 - swap, position: swap > 0.5 ? "absolute" : "relative" }}>
          <Eyebrow t={t} delay={0}>
            The programme
          </Eyebrow>
        </div>
        {swap > 0 && (
          <div style={{ opacity: swap, position: swap <= 0.5 ? "absolute" : "relative" }}>
            <Eyebrow t={t} delay={kitAt - 0.5}>
              Included with registration
            </Eyebrow>
          </div>
        )}
      </div>
      <div style={row}>
        <Item t={t} at={0.1} icon={Megaphone} label="জয়ন্তী র‍্যালি" />
        <Item t={t} at={cue("programme", 1)} icon={Award} label="শিক্ষক সম্মাননা" />
        <Item t={t} at={cue("programme", 2)} icon={Users} label="ব্যাচ রিইউনিয়ন" />
        <Item t={t} at={cue("programme", 3)} icon={Music} label="সাংস্কৃতিক সন্ধ্যা" />
      </div>
      <div style={{ width: v ? 600 : 900, height: 1, background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)`, opacity: swap }} />
      <div style={row}>
        <Item t={t} at={cue("programme", 4)} icon={Shirt} label="জয়ন্তী টি-শার্ট" />
        <Item t={t} at={cue("programme", 5)} icon={BookOpen} label="স্মারকগ্রন্থ" />
        <Item t={t} at={cue("programme", 6)} icon={Gift} label="স্মারক উপহার" />
        <Item t={t} at={cue("programme", 7)} icon={UtensilsCrossed} label="সারাদিনের খাবার" />
      </div>
    </Stage>
  );
};

/* 4 · The deadline: a calendar page drops in; the gate closes. */
const DeadlineScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const lockAt = cue("deadline", 3);
  const lock = useRise(t, lockAt);
  return (
    <Stage gap={v ? 40 : 30}>
      <Eyebrow t={t} delay={0}>
        Registration deadline
      </Eyebrow>
      <CalendarCard t={t} delay={cue("deadline", 1, 0.35)} month="নভেম্বর" day={bn(30)} year="2026" />
      <Sub t={t} delay={cue("deadline", 1) + 0.4}>
        রেজিস্ট্রেশনের শেষ তারিখ
      </Sub>
      <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: lock, transform: `translateY(${(1 - lock) * 16}px)` }}>
        <Lock size={v ? 40 : 34} color={colors.gold} style={{ transform: `rotate(${(1 - lock) * -25}deg)` }} />
        <span style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 40 : 36, color: colors.mint }}>এরপর রেজিস্ট্রেশন বন্ধ</span>
      </div>
    </Stage>
  );
};

/* 5 · Register today. */
const Today: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  return (
    <Stage gap={v ? 34 : 26}>
      <Eyebrow t={t} delay={0}>
        Don&apos;t wait
      </Eyebrow>
      <Title t={t} delay={cue("today", 1, 0.5)} size={v ? 118 : 116}>
        আজই রেজিস্ট্রেশন করুন
      </Title>
    </Stage>
  );
};

/* 6 · Address and sign-off. */
const Cta: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const logo = v ? 230 : 190;
  return (
    <Stage gap={v ? 40 : 30}>
      <Rise t={t} delay={0}>
        <UrlPill t={t} delay={0} url="exsabujian.org/jubilee" />
      </Rise>
      <Rise t={t} delay={cue("cta", 1, 0.4)}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ width: logo, height: logo, borderRadius: logo * 0.22, background: "white", padding: 8, boxShadow: "0 18px 50px rgba(0,0,0,0.5), 0 0 0 3px rgba(228,194,122,0.5)" }}>
            <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 70 : 60, ...goldText }}>প্রাক্তন সবুজিয়ান পরিষদ</div>
          <div style={{ fontFamily: fonts.en, fontSize: v ? 28 : 24, letterSpacing: "0.3em", color: colors.mint, paddingLeft: "0.3em" }}>PRAKTAN SABUJIAN PARISHAD</div>
        </div>
      </Rise>
    </Stage>
  );
};

const SCENES: { key: string; C: React.FC<{ t: number; dur: number }> }[] = [
  { key: "intro", C: Intro },
  { key: "event", C: Event },
  { key: "programme", C: Programme },
  { key: "deadline", C: DeadlineScene },
  { key: "today", C: Today },
  { key: "cta", C: Cta },
];

const EN: Record<string, string> = {
  intro: "Fifty years of Sabuj Shikshayatan. 1976 to 2026.",
  event: "On 26 December, a grand Golden Jubilee celebration on our beloved campus.",
  programme: "A jubilee rally, honours for our teachers, batch reunions and a cultural evening — with a T-shirt, souvenir book, gift and meals all day.",
  deadline: "Registration closes on 30 November. After that, registration will be closed.",
  today: "Don't wait for the last minute — register today.",
  cta: "exsabujian.org/jubilee · Praktan Sabujian Parishad",
};

export const DeadlineVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const endFade = interpolate(frame, [durationInFrames - 24, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: endFade }}>
        <Background />
        {SCENES.map(({ key, C }) => {
          const a = start(key);
          const b = end(key);
          if (t < a - 0.5 || t > b + 0.5) return null;
          const last = key === "cta";
          const o = interpolate(t, [a - 0.45, a + 0.15, b - 0.3, b + 0.35], [0, 1, 1, last ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <AbsoluteFill key={key} style={{ opacity: o }}>
              <C t={t - a} dur={b - a} />
            </AbsoluteFill>
          );
        })}
        <Finish />
        <Subtitles tm={tm} text={EN} lastScene="cta" />
      </AbsoluteFill>
      <Soundtrack tm={tm} voice="deadline/voiceover.mp3" music="deadline/music.mp3" />
    </AbsoluteFill>
  );
};
