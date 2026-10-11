import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { uploadsRoot } from "@/lib/media/avatars";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { readJsonBody, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import {
  sendBulkSms,
  calculateSmsMetrics,
  getBulkSmsConfig,
} from "@/lib/bulksmsbd";

// Kept with the other private uploads (UPLOADS_DIR), never under public/.
const smsHistoryPath = () => path.join(uploadsRoot(), "sms-history.json");
// One broadcast costs credits per number; a cap stops a mistaken or hijacked
// admin session from draining the balance in one request.
const MAX_RECIPIENTS = 5000;

export interface SmsBroadcastRecord {
  id: string;
  timestamp: string;
  sentBy: string;
  senderId: string;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: number;
  message: string;
  charCount: number;
  isUnicode: boolean;
  partsCount: number;
  totalCreditsUsed: number;
  isSimulated: boolean;
  gatewayResponseCode?: number;
  messageId?: string | number;
  sampleRecipients: string[];
}

async function appendHistory(record: SmsBroadcastRecord) {
  try {
    await fs.mkdir(path.dirname(smsHistoryPath()), { recursive: true });
    let existing: SmsBroadcastRecord[] = [];
    try {
      const raw = await fs.readFile(smsHistoryPath(), "utf8");
      existing = JSON.parse(raw);
    } catch {
      existing = [];
    }
    existing.unshift(record);
    // Keep last 50 broadcasts
    if (existing.length > 50) {
      existing = existing.slice(0, 50);
    }
    await fs.writeFile(smsHistoryPath(), JSON.stringify(existing, null, 2), "utf8");
  } catch (err) {
    console.warn("[SMS History] Could not persist history:", err);
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    try {
      const raw = await fs.readFile(smsHistoryPath(), "utf8");
      const records = JSON.parse(raw);
      return NextResponse.json({ history: records });
    } catch {
      return NextResponse.json({ history: [] });
    }
  } catch (error) {
    console.error("[API/Admin/SMS/Send] Failed to load history:", error);
    return NextResponse.json({ history: [] });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    requireSameOrigin(req);
    requireRateLimit(req, "admin-sms-send", { limit: 30, windowMs: 60 * 60_000 });
    const { recipients, message, senderId } = await readJsonBody(req);

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "SMS message content cannot be empty." },
        { status: 400 }
      );
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one recipient phone number." },
        { status: 400 }
      );
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Send to at most ${MAX_RECIPIENTS} numbers at a time.` },
        { status: 400 }
      );
    }

    // Extract numbers if passed as objects or strings
    const rawNumbers: string[] = recipients.map((r: unknown) => {
      if (typeof r === "string") return r;
      if (typeof r === "object" && r !== null && "phone" in r) {
        return (r as { phone: string }).phone;
      }
      return "";
    }).filter(Boolean);

    const metrics = calculateSmsMetrics(message.trim());
    const config = getBulkSmsConfig();
    const effectiveSenderId = (typeof senderId === "string" && senderId.trim()) || config.senderId;

    const result = await sendBulkSms({
      numbers: rawNumbers,
      message: message.trim(),
      senderIdOverride: effectiveSenderId,
    });

    if (!result.success) {
      await logActivity({
        category: "SMS",
        action: "sms.broadcast_failed",
        status: "FAILURE",
        summary: `SMS broadcast failed: ${result.error ?? "gateway error"}`,
        actor: user,
        metadata: { recipients: result.validNumbers.length, gatewayCode: result.responseCode },
        req,
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error || "BulkSMSBD failed to dispatch SMS.",
          responseCode: result.responseCode,
          validNumbers: result.validNumbers,
          invalidNumbers: result.invalidNumbers,
          isSimulated: result.isSimulated,
        },
        { status: 400 }
      );
    }

    // Save to history audit log
    const historyItem: SmsBroadcastRecord = {
      id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      sentBy: user.email || "Admin",
      senderId: effectiveSenderId,
      totalRecipients: rawNumbers.length,
      validRecipients: result.validNumbers.length,
      invalidRecipients: result.invalidNumbers.length,
      message: message.trim(),
      charCount: metrics.charCount,
      isUnicode: metrics.isUnicode,
      partsCount: metrics.partsCount,
      totalCreditsUsed: result.validNumbers.length * metrics.partsCount,
      isSimulated: result.isSimulated,
      gatewayResponseCode: result.responseCode,
      messageId: result.messageId,
      sampleRecipients: result.validNumbers.slice(0, 5),
    };

    await appendHistory(historyItem);
    await logActivity({
      category: "SMS",
      action: "sms.broadcast",
      summary: `Sent SMS to ${result.validNumbers.length} numbers (${historyItem.totalCreditsUsed} credits)${result.isSimulated ? " [sandbox]" : ""}`,
      actor: user,
      targetType: "SmsBroadcast",
      targetId: historyItem.id,
      metadata: { recipients: result.validNumbers.length, invalid: result.invalidNumbers.length, parts: metrics.partsCount, senderId: effectiveSenderId, preview: message.trim().slice(0, 80), gatewayCode: result.responseCode },
      req,
    });

    return NextResponse.json({
      success: true,
      message: result.message || "Bulk SMS Submitted Successfully",
      messageId: result.messageId,
      totalRecipients: rawNumbers.length,
      sentCount: result.validNumbers.length,
      invalidCount: result.invalidNumbers.length,
      invalidNumbers: result.invalidNumbers,
      metrics,
      totalCreditsUsed: result.validNumbers.length * metrics.partsCount,
      isSimulated: result.isSimulated,
      historyItem,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[API/Admin/SMS/Send] Error:", error);
    return NextResponse.json({ error: "Failed to send bulk SMS" }, { status: 500 });
  }
}
