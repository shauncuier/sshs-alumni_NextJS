import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CAPTIONS, colors, fonts } from "./theme";

export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/** Dark green backdrop with faint rings that turn slowly and drifting gold dust. */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const size = Math.max(width, height) * 1.6;
  const dust = new Array(36).fill(0).map((_, i) => {
    const x = random(`x${i}`) * width;
    const speed = 0.15 + random(`s${i}`) * 0.45;
    const y = (random(`y${i}`) * height - frame * speed + height * 4) % (height + 40);
    const r = 1 + random(`r${i}`) * 2.4;
    const twinkle = 0.25 + 0.5 * Math.abs(Math.sin(frame / 40 + i));
    return { x, y, r, o: twinkle * (0.3 + random(`o${i}`) * 0.7) };
  });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, ${colors.greenLight} 0%, ${colors.greenMid} 35%, ${colors.green} 70%, #021710 100%)`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="-100 -100 200 200"
        style={{
          position: "absolute",
          left: (width - size) / 2,
          top: (height - size) / 2,
          transform: `rotate(${frame * 0.04}deg)`,
          opacity: 0.35,
        }}
      >
        {new Array(22).fill(0).map((_, i) => (
          <circle key={i} r={8 + i * 4.2} fill="none" stroke={colors.gold} strokeOpacity={i % 4 === 0 ? 0.18 : 0.07} strokeWidth={0.12} />
        ))}
      </svg>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {dust.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={colors.gold} opacity={d.o} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Fades a scene in at its start and out at its end (inside a Sequence). */
export const SceneFade: React.FC<{ duration: number; children: React.ReactNode; fadeIn?: number; fadeOut?: number }> = ({
  duration,
  children,
  fadeIn = 10,
  fadeOut = 10,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, fadeIn, duration - fadeOut, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, duration], [1.0, 1.025]);
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
};

/** Springs its children up into place `delay` seconds into the scene. */
export const Appear: React.FC<{
  delay?: number;
  children: React.ReactNode;
  y?: number;
  style?: React.CSSProperties;
  from?: "up" | "scale";
}> = ({ delay = 0, children, y = 40, style, from = "up" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay * fps, fps, config: { damping: 16, stiffness: 120, mass: 0.8 } });
  const transform = from === "scale" ? `scale(${interpolate(p, [0, 1], [0.6, 1])})` : `translateY(${interpolate(p, [0, 1], [y, 0])}px)`;
  return <div style={{ opacity: Math.min(1, p * 1.4), transform, ...style }}>{children}</div>;
};

/** A thin gold line that draws itself out from the centre. */
export const GoldRule: React.FC<{ delay?: number; width?: number }> = ({ delay = 0, width = 220 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = interpolate(frame - delay * fps, [0, 20], [0, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return <div style={{ width: w, height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)`, margin: "0 auto" }} />;
};

/** English subtitles along the bottom. */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const t = frame / fps;
  const cap = CAPTIONS.find((c) => t >= c.from && t < c.to);
  if (!cap) return null;
  const o = interpolate(t, [cap.from, cap.from + 0.2, cap.to - 0.15, cap.to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: vertical ? 150 : 46 }}>
      <div
        style={{
          opacity: o,
          maxWidth: vertical ? 940 : 1500,
          padding: vertical ? "14px 28px" : "10px 26px",
          borderRadius: 14,
          background: "rgba(2, 18, 12, 0.62)",
          color: colors.cream,
          fontFamily: fonts.en,
          fontWeight: 500,
          fontSize: vertical ? 40 : 34,
          lineHeight: 1.3,
          textAlign: "center",
        }}
      >
        {cap.text}
      </div>
    </AbsoluteFill>
  );
};
