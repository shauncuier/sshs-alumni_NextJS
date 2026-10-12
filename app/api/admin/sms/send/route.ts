import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { AppError } from "@/lib/app-error";
import { logActivity } from "@/lib/activity-log";
import { readJsonBody, LARGE_JSON_BYTES, requireRateLimit, requireSameOrigin } from "@/lib/request-security";
import { listBroadcasts, recordBroadcast } from "@/lib/sms-history";
import {
  sendBulkSms,
  calculateSmsMetrics,
  getBulkSmsConfig,
} from "@/lib/bulksmsbd";

// One broadcast costs credits per number; a cap stops a mistaken or hijacked
// admin session from draining the balance in one request.
const MAX_RECIPIENTS = 5000;

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }
    return NextResponse.json({ history: await listBroadcasts() });
  } catch (error) {
    console.error("[API/Admin/SMS/Send] Failed to load history:", error);
    return NextResponse.json({ error: "Could not load the SMS history." }, { status: 503 });
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
    const { recipients, message, senderId } = await readJsonBody(req, LARGE_JSON_BYTES);

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
        return String((r as { phone: unknown }).phone ?? "");
      }
      return "";
    }).filter(Boolean);

    const text = message.trim();
    const metrics = calculateSmsMetrics(text);
    const config = getBulkSmsConfig();
    const effectiveSenderId = (typeof senderId === "string" && senderId.trim()) || config.senderId;

    const result = await sendBulkSms({
      numbers: rawNumbers,
      message: text,
      senderIdOverride: effectiveSenderId,
    });

    const base = {
      sentBy: user.email || "Admin",
      senderId: effectiveSenderId,
      message: text,
      charCount: metrics.charCount,
      isUnicode: metrics.isUnicode,
      partsCount: metrics.partsCount,
      totalRecipients: rawNumbers.length,
      validRecipients: result.validNumbers.length,
      invalidRecipients: result.invalidNumbers.length,
      totalCreditsUsed: result.validNumbers.length * metrics.partsCount,
      isSimulated: result.isSimulated,
      gatewayResponseCode: result.responseCode,
      messageId: result.messageId,
      recipients: result.validNumbers,
    };

    if (!result.success) {
      // Record attempts that reached the gateway: some batches may already have been sent and charged.
      const failed = result.validNumbers.length > 0 ? await recordBroadcast({ ...base, status: "FAILED", error: result.error }) : null;
      await logActivity({
        category: "SMS",
        action: "sms.broadcast_failed",
        status: "FAILURE",
        summary: `SMS broadcast failed: ${result.error ?? "gateway error"}`,
        actor: user,
        targetType: failed ? "SmsBroadcast" : null,
        targetId: failed?.id ?? null,
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

    const historyItem = await recordBroadcast({ ...base, status: "SENT" });
    await logActivity({
      category: "SMS",
      action: "sms.broadcast",
      summary: `Sent SMS to ${result.validNumbers.length} numbers (${historyItem.totalCreditsUsed} credits)${result.isSimulated ? " [sandbox]" : ""}`,
      actor: user,
      targetType: "SmsBroadcast",
      targetId: historyItem.id,
      metadata: { recipients: result.validNumbers.length, invalid: result.invalidNumbers.length, parts: metrics.partsCount, senderId: effectiveSenderId, preview: text.slice(0, 80), gatewayCode: result.responseCode },
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
      totalCreditsUsed: historyItem.totalCreditsUsed,
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
