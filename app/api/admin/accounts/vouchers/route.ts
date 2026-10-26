import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { requireFinance } from "@/lib/finance/guard";
import { RECEIPT_MAX_BYTES } from "@/lib/media/receipts";
import { processVoucherFile, saveVoucherFile } from "@/lib/media/vouchers";
import { readLimitedFormData, requireRateLimit, requireSameOrigin } from "@/lib/request-security";

// POST /api/admin/accounts/vouchers — upload a bill or receipt (photo or PDF, form field "file") for a voucher.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireFinance();
    requireRateLimit(req, "finance-voucher-upload", { limit: 120, windowMs: 60 * 60_000 });
    const form = await readLimitedFormData(req, RECEIPT_MAX_BYTES + 64 * 1024);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("INVALID_RECEIPT", 400, "Please choose a photo or PDF of the bill.");
    const saved = await saveVoucherFile(await processVoucherFile(Buffer.from(await file.arrayBuffer())));
    await logActivity({ category: "PAYMENT", action: "finance.attachment_uploaded", summary: "Uploaded a bill or receipt for a voucher", actor: me, targetType: "VoucherFile", targetId: saved.id, req });
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/accounts/vouchers");
  }
}
