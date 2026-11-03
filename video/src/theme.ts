import { loadFont as loadHind } from "@remotion/google-fonts/HindSiliguri";
import { loadFont as loadSerifBn } from "@remotion/google-fonts/NotoSerifBengali";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadWorkSans } from "@remotion/google-fonts/WorkSans";

export const FPS = 30;

/** The voiceover starts this many seconds into the video. */
export const VO_OFFSET = 0.5;
export const DURATION_S = 63;

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

/**
 * Scene start times in seconds of the whole video, taken from the voiceover's
 * word timings (voiceover take 2, eleven_v4, voice "Rakib") plus VO_OFFSET.
 */
export const SCENES = {
  intro: 0,
  campus: 7.4,
  teachers: 14.0,
  title: 20.9,
  date: 25.75,
  programme: 30.15,
  kit: 37.1,
  fees: 44.15,
  deadline: 49.75,
  cta: 52.45,
  end: DURATION_S,
} as const;

/** English subtitles, absolute seconds. */
export const CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: 0.6, to: 7.35, text: "1976. Amid the green of Sitakunda, Sabuj Shikshayatan began its journey." },
  { from: 7.45, to: 13.95, text: "Fifty years on, the same field, the same classrooms and countless memories call us back." },
  { from: 14.0, to: 20.85, text: "To honour the teachers who showed us the way… and to find our old friends again—" },
  { from: 20.95, to: 25.7, text: "Praktan Sabujian Parishad presents the Golden Jubilee 2026." },
  { from: 25.75, to: 30.1, text: "26 December, 8 AM to 9 PM, at the school campus." },
  { from: 30.15, to: 37.05, text: "Jubilee rally, flag hoisting, honouring our teachers, batch reunions, a cultural show and a raffle draw." },
  { from: 37.1, to: 44.1, text: "Breakfast, lunch, biryani dinner, the Jubilee T-shirt, the souvenir book and a commemorative gift." },
  { from: 44.15, to: 48.3, text: "Registration fee: Tk 1,250 to Tk 1,500." },
  { from: 48.35, to: 49.7, text: "Bring your family along." },
  { from: 49.75, to: 52.4, text: "Registration is open until 30 November." },
  { from: 52.45, to: 56.85, text: "Register now at exsabujian.org/jubilee" },
  { from: 56.85, to: 61.2, text: "See you on our beloved campus for the 50-year celebration." },
];
