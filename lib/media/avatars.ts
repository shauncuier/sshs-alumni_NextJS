import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "@/lib/app-error";

export const AVATAR_LIMITS = { maxBytes: 5 * 1024 * 1024, minSide: 600 } as const;

const MASTER_MAX_SIDE = 2400;
const AVATAR_SIZE = 400;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const ID_PATTERN = /^[a-f0-9]{32}$/;

export type AvatarFile = "avatar.webp" | "original.jpg";
const AVATAR_FILES: readonly AvatarFile[] = ["avatar.webp", "original.jpg"];

const invalid = (message: string) => new AppError("INVALID_PHOTO", 400, message);

/** Where member photos live on disk: env UPLOADS_DIR, or ./uploads next to the app. */
function uploadsRoot(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
}

/**
 * Validates a photo from its real bytes (never the file name or MIME type), applies
 * the EXIF rotation, and strips all metadata (EXIF/GPS) while re-encoding:
 * a print master (JPEG, long side <= 2400 px, never upscaled) and a 400x400 web avatar.
 */
export async function processAvatar(input: Buffer): Promise<{ original: Buffer; avatar: Buffer }> {
  if (input.length > AVATAR_LIMITS.maxBytes) throw invalid("The photo must be 5 MB or smaller.");

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw invalid("Please upload a JPEG, PNG or WebP photo.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw invalid("Please upload a JPEG, PNG or WebP photo.");
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < AVATAR_LIMITS.minSide) {
    throw invalid("The photo must be at least 600 × 600 pixels.");
  }

  try {
    // sharp drops all metadata on output unless asked to keep it.
    const original = await sharp(input)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: MASTER_MAX_SIDE, height: MASTER_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    const avatar = await sharp(input)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: sharp.strategy.attention })
      .webp({ quality: 82 })
      .toBuffer();
    return { original, avatar };
  } catch {
    throw invalid("Please upload a JPEG, PNG or WebP photo.");
  }
}

/** Writes both processed files into a new random folder under UPLOADS_DIR/avatars. */
export async function saveAvatar(files: {
  original: Buffer;
  avatar: Buffer;
}): Promise<{ id: string; avatarUrl: string; originalUrl: string; dir: string }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(uploadsRoot(), "avatars", id);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(path.join(dir, "original.jpg"), files.original);
    await fs.writeFile(path.join(dir, "avatar.webp"), files.avatar);
  } catch (err) {
    await removeAvatarDir(dir);
    throw err;
  }
  return {
    id,
    dir,
    avatarUrl: `/api/media/avatars/${id}/avatar.webp`,
    originalUrl: `/api/media/avatars/${id}/original.jpg`,
  };
}

export async function removeAvatarDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

/** The file's path, or null when the id or file name is not one we wrote. */
export function avatarFilePath(id: string, file: AvatarFile): string | null {
  if (!ID_PATTERN.test(id) || !AVATAR_FILES.includes(file)) return null;
  return path.join(uploadsRoot(), "avatars", id, file);
}
