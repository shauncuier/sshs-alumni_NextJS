import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BookOpen, Feather, Image as ImageIcon, Mail, Newspaper, PenLine } from "lucide-react";
import timings from "../souvenir/timings.json";
import { bn, colors, fonts, goldText } from "../theme";
import { Background, useVertical } from "../ui";
import { CalendarCard, Eyebrow, Finish, makeClock, Rise, Soundtrack, Stage, Sub, Subtitles, Timings, Title, UrlPill, useRise, VO_OFFSET } from "./kit";

const tm = timings as Timings;
const { start, end, cue } = makeClock(tm);
export const SOUVENIR_DURATION_FRAMES = Math.ceil((tm.voEnd + VO_OFFSET + 3.4) * 30);

/** A print with a white border, tilted, drifting slowly. */
const Print: React.FC<{ src: string; t: number; delay: number; x: number; y: number; w: number; rot: number; pos?: string }> = ({ src, t, delay, x, y, w, rot, pos = "50% 30%" }) => {
  const p = useRise(t, delay);
  const drift = (t - delay) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        padding: w * 0.04,
        paddingBottom: w * 0.14,
        background: "#f6f1e6",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        transform: `translateY(${(1 - p) * 60 - drift}px) rotate(${rot + (1 - p) * 6}deg)`,
        opacity: Math.min(1, p * 1.4),
      }}
    >
      <div style={{ width: "100%", aspectRatio: "4 / 3", overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: "sepia(0.55) contrast(1.05) brightness(0.95)" }} />
      </div>
    </div>
  );
};

/* 1 · Fifty years of faces and memories: old prints drift in. */
const Intro: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const { width, height } = useVideoConfig();
  const w = v ? 520 : 470;
  return (
    <AbsoluteFill>
      <Print src="school-campus.jpg" t={t} delay={0.1} x={v ? 60 : width * 0.08} y={v ? 230 : 110} w={w} rot={-7} pos="50% 50%" />
      <Print src="souvenir/anwar-ali-speech-1.jpg" t={t} delay={cue("intro", 1, 0.3)} x={v ? width - w - 50 : width * 0.62} y={v ? 520 : 140} w={w * 0.85} rot={6} />
      <Print src="souvenir/anwar-ali-speech-2.jpg" t={t} delay={cue("intro", 2, 0.3)} x={v ? 140 : width * 0.36} y={v ? 830 : height * 0.36} w={w * 0.8} rot={-3} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 70%, rgba(3,22,16,0.95) 0%, rgba(3,22,16,0.7) 40%, transparent 75%)" }} />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", flexDirection: "column", gap: 12, paddingBottom: v ? 340 : 160 }}>
        <Title t={t} delay={0.3} size={v ? 92 : 84}>
          পঞ্চাশ বছরের পথচলা
        </Title>
        <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
          <Sub t={t} delay={cue("intro", 1)}>হাজারো মুখ</Sub>
          <Rise t={t} delay={cue("intro", 2) - 0.1}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: colors.gold }} />
          </Rise>
          <Sub t={t} delay={cue("intro", 2)}>অগণিত স্মৃতি</Sub>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2 · The souvenir book: a cover forms, then opens to a page waiting for your words. */
const Book: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const inP = useRise(t, 0);
  const openAt = cue("book", 2, 0.2);
  const open = interpolate(t, [openAt, openAt + 1.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const W = v ? 470 : 400;
  const H = W * 1.38;
  const ink = interpolate(t, [openAt + 1.0, openAt + 2.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage gap={v ? 46 : 30}>
      <div style={{ position: "relative", width: W * 2, height: H, transform: `translateX(${(1 - open) * -W * 0.5}px) scale(${0.9 + 0.1 * inP})`, opacity: inP, perspective: 2400 }}>
        {/* Right page, under the cover */}
        <div style={{ position: "absolute", left: W, top: 0, width: W, height: H, background: "#f7f2e7", borderRadius: "4px 14px 14px 4px", boxShadow: "inset 18px 0 30px rgba(0,0,0,0.12), 0 24px 60px rgba(0,0,0,0.5)", padding: W * 0.12, display: "flex", flexDirection: "column", gap: W * 0.05 }}>
          <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: W * 0.085, color: colors.green }}>আপনার লেখা</div>
          {[0.92, 0.78, 0.86, 0.7, 0.9, 0.6].map((len, i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, background: colors.goldDeep, opacity: 0.6, width: `${len * Math.min(1, Math.max(0, ink * 6 - i)) * 100}%` }} />
          ))}
          <PenLine size={W * 0.12} color={colors.goldDeep} style={{ marginTop: "auto", alignSelf: "flex-end", opacity: ink }} />
        </div>
        {/* Cover, hinged on its left edge */}
        <div style={{ position: "absolute", left: W, top: 0, width: W, height: H, transformOrigin: "0% 50%", transform: `rotateY(${-170 * open}deg)`, transformStyle: "preserve-3d" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              borderRadius: "4px 16px 16px 4px",
              background: `linear-gradient(135deg, #0d4a38, ${colors.green} 60%, #031a13)`,
              boxShadow: "0 30px 70px rgba(0,0,0,0.6)",
              border: `2px solid rgba(228,194,122,0.55)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: W * 0.05,
              textAlign: "center",
            }}
          >
            <div style={{ position: "absolute", inset: W * 0.05, border: `1px solid rgba(228,194,122,0.5)`, borderRadius: 8 }} />
            <div style={{ width: W * 0.36, height: W * 0.36, borderRadius: 999, background: "white", padding: 6 }}>
              <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: W * 0.12, lineHeight: 1.2, ...goldText }}>
              সুবর্ণ জয়ন্তী
              <br />
              স্মরণিকা
            </div>
            <div style={{ fontFamily: fonts.en, fontSize: W * 0.05, letterSpacing: "0.3em", color: colors.gold, paddingLeft: "0.3em" }}>1976 — 2026</div>
          </div>
          <div style={{ position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden", background: "#efe7d6", borderRadius: "16px 4px 4px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: W * 0.04, textAlign: "center", padding: W * 0.1 }}>
            <Img src={staticFile("logo-large.webp")} style={{ width: W * 0.42, opacity: 0.18, filter: "grayscale(1)" }} />
            <div style={{ fontFamily: fonts.bnSerif, fontWeight: 600, fontSize: W * 0.055, color: "#6b5a3a", lineHeight: 1.5 }}>সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়</div>
            <div style={{ fontFamily: fonts.en, fontSize: W * 0.04, letterSpacing: "0.25em", color: "#8a7650", paddingLeft: "0.25em" }}>SITAKUNDA · SINCE 1976</div>
          </div>
        </div>
      </div>
      <Sub t={t} delay={cue("book", 1)}>
        সুবর্ণ জয়ন্তী উপলক্ষে প্রকাশিত হচ্ছে স্মরণিকা
      </Sub>
    </Stage>
  );
};

const Kind: React.FC<{ t: number; at: number; icon: React.ElementType; label: string; en: string }> = ({ t, at, icon: Icon, label, en }) => {
  const v = useVertical();
  const p = useRise(t, at);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)`, width: v ? 430 : 320, padding: v ? "30px 16px" : "28px 14px", borderRadius: 26, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(228,194,122,0.45)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <Icon size={v ? 60 : 52} color={colors.gold} strokeWidth={1.3} />
      <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 50 : 44, color: colors.cream }}>{label}</div>
      <div style={{ fontFamily: fonts.en, fontSize: v ? 24 : 21, letterSpacing: "0.2em", color: colors.mint, textTransform: "uppercase", paddingLeft: "0.2em" }}>{en}</div>
    </div>
  );
};

/* 3 · What to write, and who can. */
const Kinds: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const whoAt = cue("kinds", 4, 0.3);
  const chip = (label: string, at: number) => {
    const p = useRiseInline(t, at);
    return (
      <span key={label} style={{ opacity: p, transform: `scale(${0.85 + 0.15 * p})`, display: "inline-block", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 38 : 34, color: colors.green, background: colors.gold, borderRadius: 999, padding: "10px 28px" }}>
        {label}
      </span>
    );
  };
  return (
    <Stage gap={v ? 44 : 36}>
      <Eyebrow t={t} delay={0}>
        What you can send
      </Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: v ? "1fr 1fr" : "repeat(4, 1fr)", gap: v ? 24 : 22 }}>
        <Kind t={t} at={0.1} icon={Feather} label="স্মৃতিচারণ" en="Memoir" />
        <Kind t={t} at={cue("kinds", 1)} icon={BookOpen} label="গল্প" en="Story" />
        <Kind t={t} at={cue("kinds", 2)} icon={PenLine} label="কবিতা" en="Poem" />
        <Kind t={t} at={cue("kinds", 3)} icon={Newspaper} label="প্রবন্ধ" en="Article" />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: v ? 900 : 1400 }}>
        {chip("প্রাক্তন সবুজিয়ান", whoAt)}
        {chip("বর্তমান সবুজিয়ান", whoAt + 0.35)}
        {chip("শিক্ষকমণ্ডলী", cue("kinds", 5))}
      </div>
    </Stage>
  );
};
// Hook-free variant for use inside a loop helper.
const useRiseInline = (t: number, delay: number) => {
  const x = Math.max(0, Math.min(1, (t - delay) / 0.6));
  return 1 - Math.pow(1 - x, 3);
};

/* 4 · How to send: a clean form card types itself in. */
const Form: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const w = v ? 900 : 980;
  const nameAt = cue("form", 2, 0.3);
  const textAt = nameAt + 1.0;
  const typed = (s: string, at: number, dur: number) => {
    type Seg = { segment(s: string): Iterable<{ segment: string }> };
    const Segmenter = (Intl as unknown as { Segmenter: new (l: string, o: { granularity: string }) => Seg }).Segmenter;
    const chars = [...new Segmenter("bn", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
    const n = Math.max(0, Math.min(chars.length, Math.floor(((t - at) / dur) * chars.length)));
    return chars.slice(0, n).join("");
  };
  const loginAt = cue("form", 3, 0.2);
  const login = useRiseInline(t, loginAt);
  const field = (label: string, value: string, h = 64) => (
    <div>
      <div style={{ fontFamily: fonts.bn, fontWeight: 600, fontSize: v ? 28 : 24, color: "#334155", marginBottom: 8 }}>{label}</div>
      <div style={{ minHeight: h, borderRadius: 14, border: "1.5px solid #cbd5e1", background: "white", padding: "12px 18px", fontFamily: fonts.bn, fontSize: v ? 32 : 28, color: "#0f172a", lineHeight: 1.45 }}>{value}</div>
    </div>
  );
  return (
    <Stage gap={v ? 40 : 30}>
      <Rise t={t} delay={0.05}>
        <UrlPill t={t} delay={0.15} url="exsabujian.org/magazine" />
      </Rise>
      <Rise t={t} delay={0.55}>
        <div style={{ width: w, borderRadius: 30, background: "#f8fafc", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", padding: v ? 38 : 34, display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
          <div style={{ fontFamily: fonts.bnSerif, fontWeight: 800, fontSize: v ? 44 : 40, color: colors.green }}>স্মরণিকার জন্য লেখা পাঠান</div>
          {field("আপনার নাম *", typed("জাশেদুল ইসলাম শাওন", nameAt, 0.9))}
          {field("আপনার লেখা *", typed("সেই সবুজ মাঠ, টিফিনের ঘণ্টা আর প্রিয় শিক্ষকদের কথা…", textAt, 1.8), v ? 150 : 120)}
          <div style={{ alignSelf: "flex-start", fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 32 : 28, color: "white", background: "#065f46", borderRadius: 14, padding: "14px 34px" }}>লেখা পাঠান</div>
          <div style={{ position: "absolute", right: v ? 30 : 34, bottom: v ? 34 : 30, opacity: login, transform: `scale(${0.8 + 0.2 * login}) rotate(-4deg)`, fontFamily: fonts.bn, fontWeight: 700, fontSize: v ? 34 : 30, color: colors.green, background: colors.gold, borderRadius: 999, padding: "10px 26px", boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}>
            লগইন লাগবে না
          </div>
        </div>
      </Rise>
    </Stage>
  );
};

/* 5 · Old photos by email. */
const Photos: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const mailAt = cue("photos", 1, 0.3);
  const fly = interpolate(t, [mailAt - 0.2, mailAt + 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <Stage gap={v ? 44 : 34}>
      <Eyebrow t={t} delay={0}>
        Old photographs
      </Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: v ? 40 : 70 }}>
        <Rise t={t} delay={0.1}>
          <div style={{ position: "relative", width: v ? 300 : 280, height: v ? 260 : 240, transform: `translateX(${fly * 40}px) scale(${1 - fly * 0.25})`, opacity: 1 - fly * 0.4 }}>
            {[-8, 4, -2].map((r, i) => (
              <div key={i} style={{ position: "absolute", inset: 0, background: "#f6f1e6", padding: 10, paddingBottom: 30, transform: `rotate(${r}deg) translate(${i * 10}px, ${i * -8}px)`, boxShadow: "0 14px 30px rgba(0,0,0,0.45)" }}>
                <div style={{ width: "100%", height: "100%", background: "#d6cbb3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={64} color="#8a7a5a" strokeWidth={1.3} />
                </div>
              </div>
            ))}
          </div>
        </Rise>
        <Rise t={t} delay={mailAt}>
          <div style={{ width: v ? 220 : 210, height: v ? 220 : 210, borderRadius: 999, border: `2px solid ${colors.gold}`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(228,194,122,0.08)" }}>
            <Mail size={v ? 100 : 92} color={colors.gold} strokeWidth={1.3} />
          </div>
        </Rise>
      </div>
      <Rise t={t} delay={mailAt + 0.3}>
        <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 58 : 56, color: colors.cream, letterSpacing: "0.02em" }}>info@exsabujian.org</div>
      </Rise>
      <Sub t={t} delay={cue("photos", 2, 0.5)}>
        সাথে আপনার নাম ও এসএসসি ব্যাচ
      </Sub>
    </Stage>
  );
};

/* 6 · The deadline. */
const DeadlineScene: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  return (
    <Stage gap={v ? 40 : 28}>
      <Eyebrow t={t} delay={0}>
        Last date
      </Eyebrow>
      <CalendarCard t={t} delay={cue("deadline", 1, 0.5)} month="ডিসেম্বর" day={bn(5)} year="2026" />
      <Sub t={t} delay={0.3}>
        লেখা পাঠানোর শেষ তারিখ
      </Sub>
    </Stage>
  );
};

/* 7 · A pen writes a golden line. */
const Pen: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const draw = interpolate(t, [0.1, 2.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const L = 1400;
  const W = v ? 900 : 1100;
  const path = "M20 120 C 120 20, 200 200, 300 110 S 470 30, 560 120 S 720 200, 820 100 S 980 40, 1080 110";
  // Pen tip follows the line's end.
  const tipX = 20 + draw * 1060;
  const tipY = 110 + Math.sin(draw * Math.PI * 4.2) * 50;
  return (
    <Stage gap={v ? 40 : 24}>
      <div style={{ position: "relative", width: W, height: 240 }}>
        <svg viewBox="0 0 1100 240" width={W} height={240 * (W / 1100)} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="ink" x1="0" x2="1">
              <stop offset="0" stopColor="#f3dca0" />
              <stop offset="1" stopColor={colors.goldDeep} />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke="url(#ink)" strokeWidth={6} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - draw)} />
        </svg>
        <div style={{ position: "absolute", left: (tipX / 1100) * W - 10, top: (tipY / 240) * 240 * (W / 1100) - 86, transform: "rotate(-35deg)", opacity: draw < 1 ? 1 : 0.0 }}>
          <PenLine size={96} color={colors.gold} strokeWidth={1.3} />
        </div>
      </div>
      <Title t={t} delay={0.4} size={v ? 78 : 72}>
        আপনার কলমেই উঠে আসুক
      </Title>
      <Sub t={t} delay={cue("pen", 1, 0.4)}>
        সবুজ শিক্ষায়তনের সোনালি দিনগুলো
      </Sub>
    </Stage>
  );
};

/* 8 · Sign-off. */
const End: React.FC<{ t: number }> = ({ t }) => {
  const v = useVertical();
  const logo = v ? 230 : 190;
  return (
    <Stage gap={v ? 34 : 24}>
      <Rise t={t} delay={0}>
        <div style={{ width: logo, height: logo, borderRadius: logo * 0.22, background: "white", padding: 8, boxShadow: "0 18px 50px rgba(0,0,0,0.5), 0 0 0 3px rgba(228,194,122,0.5)" }}>
          <Img src={staticFile("logo-large.webp")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      </Rise>
      <Eyebrow t={t} delay={0.2}>
        Publishing sub-committee
      </Eyebrow>
      <Title t={t} delay={0.3} size={v ? 70 : 62}>
        প্রকাশনা উপকমিটি
      </Title>
      <Sub t={t} delay={cue("end", 1, 0.3)}>
        প্রাক্তন সবুজিয়ান পরিষদ
      </Sub>
      <Rise t={t} delay={cue("end", 1) + 0.8}>
        <div style={{ fontFamily: fonts.en, fontWeight: 600, fontSize: v ? 40 : 36, color: colors.gold, letterSpacing: "0.04em" }}>exsabujian.org/magazine</div>
      </Rise>
    </Stage>
  );
};

const SCENES: { key: string; C: React.FC<{ t: number }> }[] = [
  { key: "intro", C: Intro },
  { key: "book", C: Book },
  { key: "kinds", C: Kinds },
  { key: "form", C: Form },
  { key: "photos", C: Photos },
  { key: "deadline", C: DeadlineScene },
  { key: "pen", C: Pen },
  { key: "end", C: End },
];

const EN: Record<string, string> = {
  intro: "Fifty years of journey, thousands of faces, countless memories.",
  book: "For the Golden Jubilee, a souvenir book is being published — and your writing can be in it.",
  kinds: "Memoirs, stories, poems or articles. Former and current students and teachers can all write.",
  form: "Sending is easy: go to exsabujian.org/magazine, add your name and your writing. No login needed.",
  photos: "Have old photos? Send them to info@exsabujian.org with your name and SSC batch.",
  deadline: "The last date to send your writing is 5 December.",
  pen: "Let your pen bring back the golden days of Sabuj Shikshayatan.",
  end: "Publishing sub-committee, Praktan Sabujian Parishad",
};

export const SouvenirVideo: React.FC = () => {
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
          const b = end(key, 3.4);
          if (t < a - 0.5 || t > b + 0.5) return null;
          const last = key === "end";
          const o = interpolate(t, [a - 0.45, a + 0.15, b - 0.3, b + 0.35], [0, 1, 1, last ? 1 : 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <AbsoluteFill key={key} style={{ opacity: o }}>
              <C t={t - a} />
            </AbsoluteFill>
          );
        })}
        <Finish />
        <Subtitles tm={tm} text={EN} lastScene="end" />
      </AbsoluteFill>
      <Soundtrack tm={tm} voice="souvenir/voiceover.mp3" music="souvenir/music.mp3" />
    </AbsoluteFill>
  );
};
