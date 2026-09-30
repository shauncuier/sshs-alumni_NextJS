import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AppError } from "@/lib/app-error";
import { PROOF_MAX_BYTES } from "@/lib/members/proof-types";
import { uploadsRoot } from "./avatars";

// Proof-of-study documents uploaded when joining. They are private (admins only)
// and deleted once the membership is decided; see lib/members/proof-retention.ts.

export const PROOF_LIMITS = { maxBytes: PROOF_MAX_BYTES } as const;

// Decoded size guard: a small file can declare enormous dimensions (decompression bomb).
const MAX_INPUT_PIXELS = 100_000_000;
const SHARP_INPUT = { limitInputPixels: MAX_INPUT_PIXELS };
const MAX_SIDE = 2400;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const ID_PATTERN = /^[a-f0-9]{32}$/;
const PDF_MAGIC = Buffer.from("%PDF-", "latin1");

export type ProofFile = "document.jpg" | "document.pdf";
const PROOF_FILES: readonly string[] = ["document.jpg", "document.pdf"];

export interface ProcessedProof {
  data: Buffer;
  mime: "image/jpeg" | "application/pdf";
  ext: "jpg" | "pdf";
}

const invalid = (message = "Please upload your proof as a JPEG, PNG, WebP or PDF file.") =>
  new AppError("INVALID_PROOF", 400, message);

function proofsRoot(): string {
  return path.join(uploadsRoot(), "proofs");
}

/**
 * Validates a proof document from its real bytes (never the file name or MIME
 * type). A PDF is stored exactly as uploaded and never parsed or rendered here.
 * An image is re-encoded as JPEG with the EXIF rotation applied and all metadata
 * (EXIF/GPS) stripped, long side at most 2400 px, never upscaled.
 */
export async function processProof(input: Buffer): Promise<ProcessedProof> {
  if (input.length > PROOF_LIMITS.maxBytes) throw invalid("The proof document must be 10 MB or smaller.");
  if (input.length === 0) throw invalid();
  if (input.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return { data: input, mime: "application/pdf", ext: "pdf" };
  }

  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, SHARP_INPUT).metadata();
  } catch {
    throw invalid();
  }
  if (!meta.format || !ALLOWED_IMAGE_FORMATS.has(meta.format) || !meta.width || !meta.height) throw invalid();
  if (meta.width * meta.height > MAX_INPUT_PIXELS) throw invalid("The proof image dimensions are too large. Please use a smaller image.");

  try {
    // sharp drops all metadata on output unless asked to keep it.
    const data = await sharp(input, SHARP_INPUT)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    return { data, mime: "image/jpeg", ext: "jpg" };
  } catch {
    throw invalid();
  }
}

/** Writes the processed document into a new random folder under UPLOADS_DIR/proofs. */
export async function saveProof(
  proof: ProcessedProof
): Promise<{ id: string; dir: string; fileUrl: string; mime: ProcessedProof["mime"] }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(proofsRoot(), id);
  const file: ProofFile = `document.${proof.ext}`;
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(path.join(dir, file), proof.data);
  } catch (err) {
    await removeProofDir(dir);
    throw err;
  }
  return { id, dir, fileUrl: `/api/media/proofs/${id}/${file}`, mime: proof.mime };
}

/** Best-effort cleanup (e.g. after a failed join); never throws, but logs a failure (folder id only). */
export async function removeProofDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true }).catch((err: NodeJS.ErrnoException) => {
    console.error(`[proofs] Could not remove proof folder ${path.basename(dir)} (${err?.code ?? err?.name ?? "error"}).`);
  });
}

/** The folder of a stored proof URL, or null when the URL is not one we wrote. */
export function proofDirFromUrl(fileUrl: string): string | null {
  const match = /^\/api\/media\/proofs\/([a-f0-9]{32})\/(document\.(?:jpg|pdf))$/.exec(fileUrl);
  return match ? path.join(proofsRoot(), match[1]) : null;
}

/** Deletes a stored proof's folder; throws when the files could not be removed. */
export async function deleteProofFiles(fileUrl: string): Promise<void> {
  const dir = proofDirFromUrl(fileUrl);
  if (!dir) return; // Nothing of ours on disk.
  await fs.rm(dir, { recursive: true, force: true });
}

/** The file's path, or null when the id or file name is not one we wrote. */
export function proofFilePath(id: string, file: string): string | null {
  if (!ID_PATTERN.test(id) || !PROOF_FILES.includes(file)) return null;
  return path.join(proofsRoot(), id, file);
}
