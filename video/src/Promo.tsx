import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { DURATION_S, FPS, SCENES, VO_OFFSET } from "./theme";
import { Background, Captions, SceneFade } from "./ui";
import {
  CampusScene,
  CtaScene,
  DateScene,
  DeadlineScene,
  FeesScene,
  IntroScene,
  KitScene,
  ProgrammeScene,
  TeachersScene,
  TitleScene,
} from "./scenes";

export const DURATION_FRAMES = DURATION_S * FPS;

/** Scenes overlap by this many frames so each one crossfades into the next. */
const OVERLAP = 8;

const ORDER: { key: keyof typeof SCENES; render: (duration: number) => React.ReactNode }[] = [
  { key: "intro", render: () => <IntroScene /> },
  { key: "campus", render: (d) => <CampusScene duration={d} /> },
  { key: "teachers", render: () => <TeachersScene /> },
  { key: "title", render: () => <TitleScene /> },
  { key: "date", render: () => <DateScene /> },
  { key: "programme", render: () => <ProgrammeScene /> },
  { key: "kit", render: () => <KitScene /> },
  { key: "fees", render: () => <FeesScene /> },
  { key: "deadline", render: () => <DeadlineScene /> },
  { key: "cta", render: () => <CtaScene /> },
];

const KEYS = Object.keys(SCENES) as (keyof typeof SCENES)[];

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const endFade = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: endFade }}>
        <Background />
        {ORDER.map(({ key, render }) => {
          const start = Math.round(SCENES[key] * FPS);
          const next = SCENES[KEYS[KEYS.indexOf(key) + 1]];
          const end = Math.round(next * FPS);
          const from = Math.max(0, start - OVERLAP);
          const duration = end - from + (key === "cta" ? 0 : OVERLAP);
          return (
            <Sequence key={key} from={from} durationInFrames={duration} name={key}>
              <SceneFade duration={duration} fadeIn={key === "intro" ? 15 : OVERLAP * 2} fadeOut={key === "cta" ? 1 : OVERLAP * 2}>
                {render(duration)}
              </SceneFade>
            </Sequence>
          );
        })}
        <Captions />
      </AbsoluteFill>
      <Sequence from={Math.round(VO_OFFSET * FPS)} name="voiceover">
        <Audio src={staticFile("voiceover.mp3")} />
      </Sequence>
    </AbsoluteFill>
  );
};
