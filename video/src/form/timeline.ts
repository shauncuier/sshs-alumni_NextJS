import timings from "./timings.json";

/** The voiceover starts this many seconds into the video. */
export const VO_OFFSET = 0.6;
export const DURATION_S = Math.ceil(timings.voEnd + VO_OFFSET + 3);

export type Scene =
  | "intro"
  | "open"
  | "details"
  | "contact"
  | "profile"
  | "proof"
  | "continue"
  | "step2"
  | "pay"
  | "paydetails"
  | "submit"
  | "ticket"
  | "end";

/** Video time (s) at which the voiceover says cue word `i` of `scene` (0 = first word). */
export const T = (scene: Scene, i = 0) => (timings.cues as Record<Scene, number[]>)[scene][i] + VO_OFFSET;
export const sceneStart = (scene: Scene) => (scene === "intro" ? 0 : (timings.scenes as Record<Scene, number>)[scene] + VO_OFFSET);

/* ---------- The phone's screen: 390 × 720 CSS px, a 54 px address bar, then the page ---------- */
export const VW = 390;
export const VH = 720;
export const BAR = 54;
export const CH = VH - BAR;

/** Top of each field block (label, then a 46 px input 22 px below it), in page px. */
export const S1 = {
  stepper: 78,
  photo: 108,
  nameEn: 214,
  nameBn: 294,
  email: 374,
  password: 454,
  phone: 534,
  batch: 614,
  group: 694,
  gender: 774,
  dob: 854,
  profession: 934,
  address: 1014,
  proof: 1098,
  proofType: 1160,
  proofDoc: 1240,
  cont: 1372,
  height: 1460,
};
export const S2 = {
  stepper: 78,
  guests: 108,
  guestBox: 190,
  tshirt: 300,
  total: 386,
  howto: 516,
  channel: 598,
  qr: 676,
  last4: 892,
  paidAt: 972,
  shot: 1052,
  buttons: 1192,
  height: 1270,
};
export const LANDING_BUTTON_Y = 566;

/** Centre of a field's input box, in page px. */
export const inputY = (top: number) => top + 45;

export type ScreenName = "newtab" | "landing" | "step1" | "step2" | "review" | "ticket";

type Tap = { t: number; x: number; y: number; space: "page" | "screen"; screen: ScreenName };
type Typing = { t0: number; dur: number; text: string };
export type Sheet = { t: number; field: string; title: string; options: string[]; pick: number };

const taps: Tap[] = [];
const scrolls: Record<string, { t: number; y: number }[]> = { step1: [], step2: [] };
export const typing: Record<string, Typing> = {};
export const sheets: Sheet[] = [];
export const focus: Record<string, [number, number]> = {};

const scrollTo = (top: number, pageH: number) => Math.max(0, Math.min(pageH - CH, inputY(top) - CH * 0.42));

const tapField = (screen: "step1" | "step2", id: string, top: number, t: number, x = VW / 2, dy = 45) => {
  const pageH = screen === "step1" ? S1.height : S2.height;
  scrolls[screen].push({ t, y: scrollTo(top, pageH) });
  taps.push({ t, x, y: top + dy, space: "page", screen });
  focus[id] = [t, t + 1.2];
};
const type = (id: string, t0: number, dur: number, text: string) => {
  typing[id] = { t0, dur, text };
  focus[id] = [focus[id]?.[0] ?? t0, t0 + dur + 0.35];
};
const select = (screen: "step1" | "step2", id: string, top: number, t: number, title: string, options: string[], pick: number) => {
  tapField(screen, id, top, t);
  sheets.push({ t, field: id, title, options, pick });
  // The option row inside the sheet (screen px; see SelectSheet).
  taps.push({ t: t + 0.55, x: VW / 2, y: sheetOptionY(options.length, pick), space: "screen", screen });
};
export const sheetOptionY = (count: number, i: number) => VH - 24 - (count - i) * 52 + 26;

/* ---------- The script of what the "user" does, keyed to the voiceover ---------- */
/** The finger does one thing at a time: an action starts at its cue, or once the last one is done. */
let busy = 0;
const slot = (desired: number, dur: number) => {
  const t = Math.max(desired, busy + 0.3);
  busy = t + dur;
  return t;
};
const tapOnly = (screen: "step1" | "step2", id: string, top: number, desired: number, x?: number, dy?: number) => {
  const t = slot(desired, 0.4);
  tapField(screen, id, top, t, x, dy);
  return t;
};
const tapType = (screen: "step1" | "step2", id: string, top: number, desired: number, dur: number, text: string, x?: number) => {
  const t = slot(desired, 0.25 + dur);
  tapField(screen, id, top, t, x);
  type(id, t + 0.25, dur, text);
  return t;
};
const pick = (screen: "step1" | "step2", id: string, top: number, desired: number, title: string, options: string[], i: number) => {
  const t = slot(desired, 0.95);
  select(screen, id, top, t, title, options, i);
  return t;
};

const urlStart = T("open", 1) - 0.2;
taps.push({ t: urlStart - 0.25, x: VW / 2, y: BAR / 2, space: "screen", screen: "newtab" });
typing.url = { t0: urlStart, dur: 1.3, text: "exsabujian.org/jubilee" };
export const LANDING_AT = urlStart + 1.3 + 0.35;
const landingTap = Math.max(T("open", 2) + 0.9, LANDING_AT + 0.6);
taps.push({ t: landingTap, x: VW / 2, y: LANDING_BUTTON_Y, space: "page", screen: "landing" });
export const STEP1_AT = landingTap + 0.45;
busy = STEP1_AT;

const photoTap = tapOnly("step1", "photo", S1.photo, T("details", 1), 268, 34);
export const PHOTO_AT = photoTap + 0.45;
tapType("step1", "nameEn", S1.nameEn, T("details", 2), 0.8, "Rahim Uddin");
tapType("step1", "nameBn", S1.nameBn, T("details", 3), 0.8, "রহিম উদ্দিন");

tapType("step1", "email", S1.email, T("contact", 1), 0.9, "rahim@example.com");
tapType("step1", "password", S1.password, T("contact", 2), 0.5, "••••••••••");
tapType("step1", "phone", S1.phone, T("contact", 3), 0.8, "01700000000");

pick("step1", "batch", S1.batch, T("profile", 1), "SSC batch", ["SSC Batch 2007", "SSC Batch 2006", "SSC Batch 2005", "SSC Batch 2004", "SSC Batch 2003"], 2);
pick("step1", "group", S1.group, T("profile", 2), "Group (বিভাগ)", ["Science (বিজ্ঞান বিভাগ)", "Business Studies (ব্যবসায় শিক্ষা)", "Humanities (মানবিক বিভাগ)"], 0);
pick("step1", "gender", S1.gender, T("profile", 3), "Gender (লিঙ্গ)", ["Male (পুরুষ)", "Female (মহিলা)"], 0);
tapType("step1", "dob", S1.dob, T("profile", 4), 0.6, "12/03/1989");
tapType("step1", "profession", S1.profession, T("profile", 5), 0.45, "Engineer");
tapType("step1", "address", S1.address, T("profile", 6), 0.8, "Sitakunda, Chattogram");

pick("step1", "proofType", S1.proofType, T("proof", 1), "Type of document", ["SSC certificate (এসএসসি সনদ)", "Testimonial (প্রশংসাপত্র)", "SSC marksheet (মার্কশিট)"], 0);
const proofTap = tapOnly("step1", "proofDoc", S1.proofDoc, T("proof", 2), 120);
export const PROOF_AT = proofTap + 0.45;
export const PROOF_NOTE_AT = Math.max(T("proof", 3), PROOF_AT + 0.3);

const contTap = tapOnly("step1", "cont", S1.cont, T("continue", 1) + 0.1, VW / 2, 26);
export const STEP2_AT = contTap + 0.45;
busy = STEP2_AT;

scrolls.step2.push({ t: STEP2_AT, y: 0 });
const spouseTap = slot(Math.max(T("step2", 1), STEP2_AT + 0.5), 0.5);
taps.push({ t: spouseTap, x: 100, y: inputY(S2.guests), space: "page", screen: "step2" });
focus.spouse = [spouseTap, spouseTap + 0.8];
export const SPOUSE_AT = spouseTap + 0.25;
tapType("step2", "guestName", S2.guestBox + 30, spouseTap + 0.6, 0.6, "Fatema Begum", VW / 2);
pick("step2", "tshirt", S2.tshirt, T("step2", 2), "T-shirt size", ["S", "M", "L", "XL", "XXL"], 2);
export const TOTAL_AT = Math.max(T("step2", 3), busy + 0.2);
scrolls.step2.push({ t: TOTAL_AT, y: scrollTo(S2.total, S2.height) });

const qrTap = tapOnly("step2", "channel", S2.channel, T("pay", 1), 70, 45);
export const QR_AT = qrTap + 0.2;
export const QR_SCAN_AT = T("pay", 2);
scrolls.step2.push({ t: QR_SCAN_AT, y: scrollTo(S2.qr + 40, S2.height) });
busy = Math.max(busy, QR_SCAN_AT);

tapType("step2", "last4", S2.last4, T("paydetails", 1), 0.45, "4821");
tapType("step2", "paidAt", S2.paidAt, T("paydetails", 2), 0.9, "20/11/2026, 10:30 AM");
const shotTap = tapOnly("step2", "shot", S2.shot, T("paydetails", 3), 110, 45);
export const SHOT_AT = shotTap + 0.45;

const submitTap = tapOnly("step2", "submit", S2.buttons, T("submit", 1) + 0.15, 240, 26);
export const SUBMIT_AT = submitTap;
export const REVIEW_AT = submitTap + 0.7;
export const EMAIL_AT = T("ticket", 1);
export const TICKET_AT = T("ticket", 2);
export const GATE_AT = T("ticket", 3);
export const END_AT = sceneStart("end");

taps.sort((a, b) => a.t - b.t);

/* ---------- Queries used while rendering ---------- */
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export const screenAt = (t: number): ScreenName =>
  t >= TICKET_AT ? "ticket" : t >= REVIEW_AT ? "review" : t >= STEP2_AT ? "step2" : t >= STEP1_AT ? "step1" : t >= LANDING_AT ? "landing" : "newtab";

export const scrollAt = (screen: string, t: number) => {
  const keys = scrolls[screen];
  if (!keys || keys.length === 0) return 0;
  let y = 0;
  for (const k of keys) {
    const p = ease((t - (k.t - 0.6)) / 0.5);
    if (p <= 0) break;
    y = y + (k.y - y) * p;
  }
  return y;
};

const tapPos = (tap: Tap, t: number) => ({ x: tap.x, y: tap.space === "screen" ? tap.y : BAR + tap.y - scrollAt(tap.screen, t) });

/** Where the finger is (screen px), how pressed it is (0–1), and the last tap's ripple progress. */
export const fingerAt = (t: number) => {
  const next = taps.findIndex((k) => k.t > t);
  const prevI = next === -1 ? taps.length - 1 : next - 1;
  if (prevI < 0 && (next === -1 || taps[next].t - t > 0.6)) return null;
  const prev = prevI >= 0 ? taps[prevI] : null;
  const nxt = next === -1 ? null : taps[next];
  // Lift the finger away when nothing is coming up for a while.
  if (prev && t - prev.t > 1.6 && (!nxt || nxt.t - t > 0.6)) return null;
  let pos = prev ? tapPos(prev, t) : { x: VW * 0.7, y: VH * 0.8 };
  if (nxt && nxt.t - t < 0.55) {
    const target = tapPos(nxt, t);
    const p = ease((t - (nxt.t - 0.55)) / 0.47);
    pos = { x: pos.x + (target.x - pos.x) * p, y: pos.y + (target.y - pos.y) * p };
  }
  const since = prev ? t - prev.t : 99;
  const press = since >= 0 && since < 0.18 ? 1 - since / 0.18 : nxt && nxt.t - t < 0.06 ? 1 : 0;
  return { ...pos, press, ripple: since >= 0 && since < 0.5 ? since / 0.5 : null };
};

const graphemes = (s: string) => {
  // Split into user-perceived letters so Bangla conjuncts type in whole.
  type Seg = { segment(s: string): Iterable<{ segment: string }> };
  const Segmenter = (Intl as unknown as { Segmenter: new (l: string, o: { granularity: string }) => Seg }).Segmenter;
  return [...new Segmenter("bn", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
};

/** The typed-so-far text of a field, or `fallback` before typing starts. */
export const typedAt = (id: string, t: number, fallback = "") => {
  const k = typing[id];
  if (!k || t < k.t0) return fallback;
  const g = graphemes(k.text);
  const n = Math.min(g.length, Math.floor(((t - k.t0) / k.dur) * g.length) + 1);
  return g.slice(0, n).join("");
};

export const isFocused = (id: string, t: number) => {
  const f = focus[id];
  return !!f && t >= f[0] && t <= f[1];
};

/** The option chosen in a select, once picked. */
export const pickedAt = (id: string, t: number) => {
  const s = sheets.find((x) => x.field === id);
  return s && t >= s.t + 0.65 ? s.options[s.pick] : null;
};

export const sheetAt = (t: number) => sheets.find((s) => t >= s.t + 0.05 && t < s.t + 0.95) ?? null;

/** English subtitles, absolute seconds. */
const EN: Record<Scene, string> = {
  intro: "Registering for the Golden Jubilee 2026 takes just a few minutes. Let's go step by step.",
  open: "Open exsabujian.org/jubilee and tap \"Register now\".",
  details: "Step 1, your details. Add a clear photo of your face, then your full name in both English and Bangla.",
  contact: "Next, enter your email, a password and your mobile number.",
  profile: "Now choose your SSC batch, group, gender and date of birth. You can add your profession and address too.",
  proof: "As proof you studied here, upload your SSC certificate, testimonial or marksheet. Only the committee sees it.",
  continue: "Then tap \"Continue\".",
  step2: "Step 2, registration and payment. Add anyone coming with you and pick your T-shirt size. The total adds itself up.",
  pay: "Choose a payment channel. Scan the Bangla QR with any bank or mobile banking app and pay.",
  paydetails: "Enter the last 4 digits of the number you paid from, the payment time and a screenshot of the receipt.",
  submit: "Finally, tap \"Join & Register\".",
  ticket: "Once the committee checks your payment, your ticket arrives by email, with its QR code on your dashboard. Show it at the gate on the day.",
  end: "Registration closes 30 November. Questions? Write to info@exsabujian.org",
};
export const CAPTIONS = timings.sentences.map((s) => ({
  from: s.from + VO_OFFSET - 0.1,
  to: (s.scene === "end" ? timings.voEnd + 1.5 : s.to) + VO_OFFSET - 0.1,
  text: EN[s.scene as Scene],
  scene: s.scene as Scene,
}));
