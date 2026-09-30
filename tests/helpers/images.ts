import sharp from "sharp";

/** A photo-like test image (gradient noise) of the given size and format. */
export async function makeImage(
  width = 800,
  height = 800,
  format: "jpeg" | "png" | "webp" | "gif" = "jpeg"
): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7 + (i % width)) % 256;
  const img = sharp(raw, { raw: { width, height, channels: 3 } });
  return format === "gif" ? img.gif().toBuffer() : img.toFormat(format).toBuffer();
}

/** A minimal, valid one-page PDF. */
export function makePdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n" +
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj\n" +
      "trailer << /Root 1 0 R >>\n" +
      "%%EOF\n",
    "latin1"
  );
}

/** A JPEG that carries EXIF (including an orientation tag). */
export async function makeImageWithExif(width = 800, height = 800, orientation = 1): Promise<Buffer> {
  return sharp(await makeImage(width, height))
    .withMetadata({ orientation, exif: { IFD0: { Copyright: "secret-owner" } } })
    .jpeg()
    .toBuffer();
}
