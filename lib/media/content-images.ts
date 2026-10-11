import crypto from "crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "@/lib/app-error";
import { uploadsRoot } from "./avatars";

/**
 * Images for public content (news, gallery, stories): resized on upload into a
 * large display image and a card thumbnail, both WebP with all metadata (camera,
 * GPS location) stripped. Stored under UPLOADS_DIR/content/<random id>/ and served
 * publicly by /api/media/content/<id>/<file>.
 */

export const CONTENT_IMAGE_LIMITS = { maxBytes: 8 * 1024 * 1024, minSide: 320 } as const;
const SHARP_INPUT = { limitInputPixels: 100_000_000 };
const LARGE_MAX_SIDE = 1600;
const THUMB_WIDTH = 640;
const THUMB_HEIGHT = 400;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const ID_PATTERN = /^[a-f0-9]{32}$/;

export type ContentImageFile = "large.webp" | "thumb.webp";
export const CONTENT_IMAGE_FILES: readonly ContentImageFile[] = ["large.webp", "thumb.webp"];

const invalid = (message: string) => new AppError("INVALID_IMAGE", 400, message);

export async function processContentImage(input: Buffer): Promise<{ large: Buffer; thumb: Buffer; width: number; height: number }> {
  if (input.length === 0) throw invalid("Please choose an image.");
  if (input.length > CONTENT_IMAGE_LIMITS.maxBytes) throw invalid("The image must be 8 MB or smaller.");
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, SHARP_INPUT).metadata();
  } catch {
    throw invalid("That file is not a readable image. Use JPEG, PNG or WebP.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw invalid("Use a JPEG, PNG or WebP image.");
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < CONTENT_IMAGE_LIMITS.minSide) {
    throw invalid(`The image is too small; use at least ${CONTENT_IMAGE_LIMITS.minSide} pixels on the short side.`);
  }
  try {
    // rotate() applies the camera orientation before the metadata is dropped.
    const large = await sharp(input, SHARP_INPUT)
      .rotate()
      .resize({ width: LARGE_MAX_SIDE, height: LARGE_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(input, SHARP_INPUT)
      .rotate()
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: 78 })
      .toBuffer();
    return { large: large.data, thumb, width: large.info.width, height: large.info.height };
  } catch {
    throw invalid("The image could not be processed. Try another file.");
  }
}

export async function saveContentImage(files: { large: Buffer; thumb: Buffer }): Promise<{ id: string; url: string; thumbUrl: string }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(uploadsRoot(), "content", id);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(path.join(dir, "large.webp"), files.large);
    await fs.writeFile(path.join(dir, "thumb.webp"), files.thumb);
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    throw err;
  }
  return { id, url: `/api/media/content/${id}/large.webp`, thumbUrl: `/api/media/content/${id}/thumb.webp` };
}

/** Path of a stored content image, or null for anything that is not one. */
export function contentImagePath(id: string, file: string): string | null {
  if (!ID_PATTERN.test(id) || !(CONTENT_IMAGE_FILES as readonly string[]).includes(file)) return null;
  return path.join(uploadsRoot(), "content", id, file);
}

/** The id inside a /api/media/content/<id>/... URL, or null for other URLs. */
export function contentImageId(url: string | null | undefined): string | null {
  const match = /^\/api\/media\/content\/([a-f0-9]{32})\/(large|thumb)\.webp$/.exec(url ?? "");
  return match ? match[1] : null;
}

/** Deletes a stored content image by its URL; ignores URLs that are not ours. Never throws. */
export async function removeContentImage(url: string | null | undefined): Promise<void> {
  const id = contentImageId(url);
  if (!id) return;
  await fs.rm(path.join(uploadsRoot(), "content", id), { recursive: true, force: true }).catch(() => {});
}

/** Thumbnail URL for a stored image URL (other URLs are returned unchanged). */
export function thumbUrlFor(url: string | null | undefined): string | null {
  const id = contentImageId(url);
  return id ? `/api/media/content/${id}/thumb.webp` : url ?? null;
}
