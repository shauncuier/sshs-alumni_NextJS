import { loadFont as loadHind } from "@remotion/google-fonts/HindSiliguri";
import { loadFont as loadSerifBn } from "@remotion/google-fonts/NotoSerifBengali";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadWorkSans } from "@remotion/google-fonts/WorkSans";

import timings from "./timings.json";

export const FPS = 30;

/** The voiceover starts this many seconds into the video. */
export const VO_OFFSET = 0.5;
/** Voiceover plus a short hold on the closing card. */
export const DURATION_S = Math.ceil(timings.voEnd + VO_OFFSET + 2.5);

export const fonts = {
  bn: loadHind("normal", { weights: ["400", "600", "700"], subsets: ["bengali", "latin"] }).fontFamily,
  bnSerif: loadSerifBn("normal", { weights: ["600", "800"], subsets: ["bengali"] }).fontFamily,
  display: loadPlayfair("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily,
  displayItalic: loadPlayfair("italic", { weights: ["600"], subsets: ["latin"] }).fontFamily,
  en: loadWorkSans("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily,
};

export const colors = {
  green: "#06281e",
  greenMid: "#0b3d2e",
  greenLight: "#0f5240",
  gold: "#e4c27a",
  goldDeep: "#b98a2f",
  amber: "#fcd34d",
  cream: "#f6efe0",
  mint: "#a7d7c5",
};

export const goldText: React.CSSProperties = {
  background: "linear-gradient(180deg, #f3dca0 0%, #e4c27a 45%, #b98a2f 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
/** "2026" → "২০২৬" */
export const bn = (s: string | number) => String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);

type SceneKey = "intro" | "campus" | "teachers" | "title" | "date" | "programme" | "kit" | "fees" | "deadline" | "cta";

/**
 * Scene starts (seconds of the whole video) and the cues inside each scene, from
 * the voiceover's word timings: src/timings.json, made by scripts/timings.py.
 */
export const SCENES = {
  ...(Object.fromEntries(Object.entries(timings.scenes).map(([k, t]) => [k, t + (k === "intro" ? 0 : VO_OFFSET)])) as Record<SceneKey, number>),
  end: DURATION_S,
};

/** When (seconds into `scene`) the voiceover says cue word `i` of that scene; 0 = its first word. */
export const cue = (scene: SceneKey, i: number, lead = 0.1) =>
  Math.max(0, (timings.cues[scene][i] ?? 0) + VO_OFFSET - SCENES[scene] - lead);

const at = (scene: SceneKey, i = 0) => timings.cues[scene][i] + VO_OFFSET;
const sentence = (scene: SceneKey) => timings.sentences.find((s) => s.scene === scene)!;
const span = (scene: SceneKey) => ({ from: sentence(scene).from + VO_OFFSET - 0.1, to: sentence(scene).to + VO_OFFSET - 0.1 });

/** English subtitles, absolute seconds. */
export const CAPTIONS: { from: number; to: number; text: string }[] = [
  { ...span("intro"), text: "1976. Amid the green of Sitakunda, Sabuj Shikshayatan began its journey." },
  { ...span("campus"), text: "Fifty years on, the same field, the same classrooms and countless memories call us back." },
  { ...span("teachers"), text: "To honour the teachers who showed us the way… and to find our old friends again—" },
  { ...span("title"), text: "Praktan Sabujian Parishad presents the Golden Jubilee 2026." },
  { ...span("date"), text: "26 December, 8 AM to 9 PM, at the school campus." },
  { ...span("programme"), text: "Jubilee rally, flag hoisting, honouring our teachers, batch reunions, a cultural show and a raffle draw." },
  { ...span("kit"), text: "Breakfast, lunch, biryani dinner, the Jubilee T-shirt, the souvenir book and a commemorative gift." },
  { from: span("fees").from, to: at("fees", 3) - 0.1, text: "Registration fee: Tk 1,250 to Tk 1,500." },
  { from: at("fees", 3) - 0.1, to: span("fees").to, text: "Bring your family along." },
  { ...span("deadline"), text: "Registration is open until 30 November." },
  { from: span("cta").from, to: at("cta", 2) - 0.1, text: "Register now at exsabujian.org/jubilee" },
  { from: at("cta", 2) - 0.1, to: timings.voEnd + VO_OFFSET + 1.2, text: "See you on our beloved campus for the 50-year celebration." },
];
