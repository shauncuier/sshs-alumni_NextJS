/** Food and kit token kinds (lib/events/tokens.ts). Safe to import in the browser (gate scanner). */
export const TOKEN_KINDS = [
  { key: "BREAKFAST", bn: "সকালের নাস্তা", en: "Breakfast", perPerson: true, color: "#b45309" },
  { key: "LUNCH", bn: "দুপুরের খাবার", en: "Lunch", perPerson: true, color: "#047857" },
  { key: "DINNER", bn: "বিরিয়ানি ডিনার", en: "Biryani dinner", perPerson: true, color: "#9f1239" },
  { key: "KIT", bn: "টি-শার্ট ও উপহার", en: "T-shirt & gift kit", perPerson: false, color: "#1d4ed8" },
] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number]["key"];

export function isTokenKind(value: unknown): value is TokenKind {
  return TOKEN_KINDS.some((k) => k.key === value);
}

export function tokenKind(key: string) {
  return TOKEN_KINDS.find((k) => k.key === key) ?? null;
}

export const TOKEN_QR_PREFIX = "SSGHS-TOKEN:";
