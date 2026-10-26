import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsRoot } from "./avatars";
import { processReceipt, type ProcessedReceipt } from "./receipts";

/**
 * Bills and receipts attached to vouchers in the accounts. Same checks as payment
 * receipts (JPEG/PNG/WebP turned into JPEG, PDF kept, 10 MB), stored privately under
 * UPLOADS_DIR/vouchers/<random id>/ and served only to people who use the accounts
 * (app/api/media/vouchers/[id]/[file]).
 */

const ID_PATTERN = /^[a-f0-9]{32}$/;
const FILES = ["voucher.jpg", "voucher.pdf"];

export const processVoucherFile = processReceipt;

function root(): string {
  return path.join(uploadsRoot(), "vouchers");
}

export async function saveVoucherFile(file: ProcessedReceipt): Promise<{ id: string; url: string }> {
  const id = crypto.randomBytes(16).toString("hex");
  const dir = path.join(root(), id);
  const name = `voucher.${file.ext}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), file.data);
  return { id, url: `/api/media/vouchers/${id}/${name}` };
}

export function voucherFilePath(id: string, file: string): string | null {
  if (!ID_PATTERN.test(id) || !FILES.includes(file)) return null;
  return path.join(root(), id, file);
}

/** True for a /api/media/vouchers/<id>/voucher.(jpg|pdf) URL this site stored. */
export function isVoucherFileUrl(url: string | null | undefined): boolean {
  return /^\/api\/media\/vouchers\/[a-f0-9]{32}\/voucher\.(jpg|pdf)$/.test(url ?? "");
}
