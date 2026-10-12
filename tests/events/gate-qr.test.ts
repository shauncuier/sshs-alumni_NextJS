import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import { generateQrDataUrl } from "@/lib/id-card";
import { TICKET_QR_PREFIX } from "@/lib/events/tickets";

// The gate scanner reads tickets with jsQR on phones without a built-in QR reader
// (iPhone Safari). The ticket QR (green on white, high error correction) must decode,
// also at the downscaled size the scanner uses and as a darker, blurrier camera frame.
async function decode(dataUrl: string, size: number, tweak?: (img: sharp.Sharp) => sharp.Sharp) {
  let img = sharp(Buffer.from(dataUrl.split(",")[1], "base64")).resize(size, size).ensureAlpha();
  if (tweak) img = tweak(img);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

describe("ticket QR codes", () => {
  it("decode with the scanner's fallback reader, also from a poor camera frame", async () => {
    const text = `${TICKET_QR_PREFIX}${"a1B2-c3D4_".repeat(10)}`;
    const qr = await generateQrDataUrl(text);
    expect(await decode(qr, 320)).toBe(text);
    expect(await decode(qr, 200)).toBe(text);
    expect(await decode(qr, 260, (i) => i.blur(1.2).modulate({ brightness: 0.7 }))).toBe(text);
  });
});
