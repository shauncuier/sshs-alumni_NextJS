import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/app-error";
import { uploadsRoot } from "./avatars";

/**
 * Public PDF documents (constitution versions, notice attachments). Stored under
 * UPLOADS_DIR/documents/<random id>/document.pdf and served publicly by
 * /api/media/documents/<id>/document.pdf. Only files that start with the PDF
 * signature are accepted.
 */

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ID_PATTERN = /^[a-f0-9]{32}$/;
const FILE = "document.pdf";
const PDF_MAGIC = Buffer.from("%PDF-", "latin1");

function documentsRoot(): string {
  return path.join(uploadsRoot(), "documents");
}

/** Checks an uploaded file is a PDF within the size limit; returns it unchanged. */
export function checkDocument(input: Buffer): Buffer {
  if (input.length === 0) throw new AppError("INVALID_DOCUMENT", 400, "Please choose a PDF file.");
  if (input.length > DOCUMENT_MAX_BYTES) throw new AppError("INVALID_DOCUMENT", 400, "The PDF must be 10 MB or smaller.");
  if (!input.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) throw new AppError("INVALID_DOCUMENT", 400, "Only PDF files can be uploaded.");
  return input;
}

export async function saveDocument(data: Buffer): Promise<{ id: string; url: string }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(documentsRoot(), id);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(path.join(dir, FILE), data);
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    throw err;
  }
  return { id, url: `/api/media/documents/${id}/${FILE}` };
}

/** Path of a stored document, or null for anything that is not one. */
export function documentPath(id: string, file: string): string | null {
  if (!ID_PATTERN.test(id) || file !== FILE) return null;
  return path.join(documentsRoot(), id, file);
}

/** The id inside a /api/media/documents/<id>/document.pdf URL, or null for other URLs. */
export function documentId(url: string | null | undefined): string | null {
  const match = /^\/api\/media\/documents\/([a-f0-9]{32})\/document\.pdf$/.exec(url ?? "");
  return match ? match[1] : null;
}

/** Deletes a stored document by its URL; ignores URLs that are not ours. Never throws. */
export async function removeDocument(url: string | null | undefined): Promise<void> {
  const id = documentId(url);
  if (!id) return;
  await fs.rm(path.join(documentsRoot(), id), { recursive: true, force: true }).catch(() => {});
}
