/**
 * Shared pieces for the sponsor-grade videos (registration deadline, souvenir writing call):
 * slower springs, a vignette and fine grain over the brand background, a ducked music bed,
 * a calendar card and subtitles driven by a timings.json from scripts/timings.py.
 */
import React from "react";
import { AbsoluteFill, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { colors, fonts, goldText } from "../theme";
import { useVertical } from "../ui";

export type Timings = {
  scenes: Record<string, number>;
  cues: Record<string, number[]>;
  sentences: { scene: string; from: number; to: number }[];
  voEnd: number;
};

export const VO_OFFSET = 0.8;

export const makeClock = (tm: Timings) => {
  const order = Object.keys(tm.scenes);
  const start = (s: string) => (order[0] === s ? 0 : tm.scenes[s] + VO_OFFSET);
  const end = (s: string, tail = 3.2) => {
    const i = order.indexOf(s);
    return i + 1 < order.length ? start(order[i + 1]) : tm.voEnd + VO_OFFSET + tail;
  };
  /** Seconds into scene `s` at which the voiceover says its cue word `i` (0 = the first word). */
  const cue = (s: string, i: number, lead = 0.12) => Math.max(0, tm.cues[s][i] + VO_OFFSET - start(s) - lead);
  return { order, start, end, cue };
};

/** A slow, weighty spring: things settle rather than bounce. */
export const useRise = (t: number, delay: number) => {
  const { fps } = useVideoConfig();
  return spring({ frame: (t - delay) * fps, fps, config: { damping: 22, stiffness: 70, mass: 1.1 } });
};

export const Rise: React.FC<{ t: number; delay: number; children: React.ReactNode; y?: number; style?: React.CSSProperties; blur?: boolean }> = ({
  t,
  delay,
  children,
  y = 28,
  style,
  blur = true,
}) => {
  const p = useRise(t, delay);
  return (
    <div style={{ opacity: Math.min(1, p * 1.3), transform: `translateY(${(1 - p) * y}px)`, filter: blur ? `blur(${(1 - p) * 8}px)` : undefined, ...style }}>{children}</div>
  );
};

/** Letter-spaced small caps line in gold, with hairlines either side. */
export const Eyebrow: React.FC<{ children: React.ReactNode; t: number; delay?: number }> = ({ children, t, delay = 0 }) => {
  const v = useVertical();
  const p = useRise(t, delay);
  const w = 90 * p;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, opacity: p }}>
      <div style={{ width: w, height: 1.5, background: `linear-gradient(90deg, transparent, ${colors.gold})` }} />
      <div style={{ fontFamily: fonts.en, fontWeight: 500, fontSize: v ? 28 : 24, letterSpacing: "0.42em", color: colors.gold, paddingLeft: "0.42em", textTransform: "uppercase" }}>{children}</div>
      <div style={{ width: w, height: 1.5, background: `linear-gradient(270deg, transparent, ${colors.gold})` }} />
    </div>
  );
};

export const Title: React.FC<{ t: number; delay?: number; children: React.ReactNode; size?: number }> = ({ t, delay = 0, children, size }) => {
  const v = useVertical();
  return (
    <Rise t={t} delay={delay} y={34}>
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: size ?? (v ? 96 : 88), lineHeight: 1.22, textAlign: "center", ...goldText }}>{children}</div>
    </Rise>
  );
};

export const Sub: React.FC<{ t: number; delay?: number; children: React.ReactNode; en?: boolean }> = ({ t, delay = 0, children, en }) => {
  const v = useVertical();
  return (
    <Rise t={t} delay={delay} y={20}>
      <div style={{ fontFamily: en ? fonts.en : fonts.bn, fontWeight: en ? 400 : 600, fontSize: en ? (v ? 32 : 28) : v ? 46 : 42, color: en ? colors.mint : colors.cream, textAlign: "center", lineHeight: 1.4, letterSpacing: en ? "0.04em" : undefined }}>
        {children}
      </div>
    </Rise>
  );
};

export const Stage: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 28 }) => {
  const v = useVertical();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, paddingBottom: v ? 300 : 140, paddingLeft: 70, paddingRight: 70 }}>{children}</AbsoluteFill>
  );
};

/** Darkened corners and a whisper of film grain, over everything. */
export const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)" }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
        {new Array(140).fill(0).map((_, i) => (
          <rect key={i} x={random(`gx${seed}-${i}`) * width} y={random(`gy${seed}-${i}`) * height} width={2} height={2} fill="white" />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** A calendar page: month band on top, the day large, year beneath. */
export const CalendarCard: React.FC<{ t: number; delay: number; month: string; day: string; year: string }> = ({ t, delay, month, day, year }) => {
  const v = useVertical();
  const { fps } = useVideoConfig();
  const p = spring({ frame: (t - delay) * fps, fps, config: { damping: 15, stiffness: 80 } });
  const w = v ? 540 : 380;
  return (
    <div
      style={{
        width: w,
        borderRadius: 36,
        overflow: "hidden",
        background: colors.cream,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 2px rgba(228,194,122,0.6)",
        transform: `perspective(1200px) rotateX(${(1 - p) * 60}deg) translateY(${(1 - p) * -80}px)`,
        transformOrigin: "50% 0%",
        opacity: Math.min(1, p * 1.6),
        textAlign: "center",
      }}
    >
      <div style={{ background: `linear-gradient(180deg, ${colors.goldDeep}, #8a6420)`, color: "white", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 62 : 48, padding: "14px 0" }}>{month}</div>
      <div style={{ fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 280 : 200, color: colors.green, lineHeight: 1.1, marginTop: 6 }}>{day}</div>
      <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 34 : 30, color: colors.goldDeep, letterSpacing: "0.3em", paddingBottom: 22, paddingLeft: "0.3em" }}>{year}</div>
    </div>
  );
};

export const UrlPill: React.FC<{ t: number; delay: number; url: string }> = ({ t, delay, url }) => {
  const v = useVertical();
  const p = useRise(t, delay);
  const pulse = ((t - delay) % 1.8) / 1.8;
  return (
    <div style={{ position: "relative", opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
      {t > delay + 0.6 && <div style={{ position: "absolute", inset: 0, borderRadius: 999, border: `2px solid ${colors.gold}`, transform: `scale(${1 + pulse * 0.1}, ${1 + pulse * 0.35})`, opacity: (1 - pulse) * 0.8 }} />}
      <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 54 : 52, color: colors.green, background: `linear-gradient(180deg, #f6e2ad, ${colors.gold})`, borderRadius: 999, padding: v ? "22px 54px" : "18px 58px", boxShadow: "0 14px 40px rgba(0,0,0,0.4)" }}>
        {url}
      </div>
    </div>
  );
};

/** English subtitles, one per spoken sentence. */
export const Subtitles: React.FC<{ tm: Timings; text: Record<string, string>; lastScene: string }> = ({ tm, text, lastScene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = useVertical();
  const t = frame / fps;
  const span = (s: Timings["sentences"][number]) => ({ from: s.from + VO_OFFSET - 0.1, to: (s.scene === lastScene ? tm.voEnd + 1.4 : s.to) + VO_OFFSET - 0.1 });
  const s = tm.sentences.find((x) => t >= span(x).from && t < span(x).to);
  if (!s || !text[s.scene]) return null;
  const { from, to } = span(s);
  const o = interpolate(t, [from, from + 0.25, to - 0.2, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: v ? 130 : 46 }}>
      <div
        style={{
          opacity: o,
          maxWidth: v ? 960 : 1460,
          padding: v ? "14px 28px" : "10px 26px",
          borderRadius: 12,
          background: "rgba(2,14,10,0.58)",
          color: colors.cream,
          fontFamily: fonts.en,
          fontWeight: 400,
          fontSize: v ? 37 : 31,
          lineHeight: 1.35,
          textAlign: "center",
          letterSpacing: "0.01em",
        }}
      >
        {text[s.scene]}
      </div>
    </AbsoluteFill>
  );
};

/** Voiceover plus a music bed that dips under the voice and fades at both ends. */
export const Soundtrack: React.FC<{ tm: Timings; voice: string; music: string; musicLevel?: number; duckLevel?: number }> = ({ tm, voice, music, musicLevel = 0.42, duckLevel = 0.14 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const speaking = tm.sentences.map((s) => [s.from + VO_OFFSET - 0.25, (s.to > tm.voEnd ? tm.voEnd : s.to) + VO_OFFSET] as const);
  const lastWordEnd = tm.voEnd + VO_OFFSET;
  const volume = (f: number) => {
    const t = f / fps;
    // How close to speech we are: 1 while speaking, easing back to 0 over 0.6 s of silence.
    let near = 0;
    for (const [a, b] of speaking) {
      if (t >= a && t <= b) near = 1;
      else if (t > b && t < b + 0.6 && t < lastWordEnd) near = Math.max(near, 1 - (t - b) / 0.6);
      else if (t < a && t > a - 0.4) near = Math.max(near, 1 - (a - t) / 0.4);
    }
    if (t > lastWordEnd) near = 0;
    const base = musicLevel + (duckLevel - musicLevel) * near;
    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (durationInFrames / fps - t) / 1.8);
    return Math.max(0, base * fadeIn * fadeOut);
  };
  return (
    <>
      <Audio src={staticFile(music)} volume={volume} />
      <Sequence from={Math.round(VO_OFFSET * fps)} name="voiceover">
        <Audio src={staticFile(voice)} />
      </Sequence>
    </>
  );
};
