import type { Prisma, SmsBroadcast } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * History of bulk SMS sends from /admin/sms, in the SmsBroadcast table. Failed
 * sends are kept too, and the full recipient list, so the committee can answer
 * "who got that message?" and reconcile gateway credits.
 */

export interface SmsBroadcastRecord {
  id: string;
  timestamp: string;
  status: "SENT" | "FAILED";
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
  error?: string;
  sampleRecipients: string[];
}

export type NewBroadcast = Omit<SmsBroadcastRecord, "id" | "timestamp" | "sampleRecipients"> & { recipients: string[] };

function toRecord(row: SmsBroadcast): SmsBroadcastRecord {
  const recipients = Array.isArray(row.recipients) ? (row.recipients as string[]) : [];
  return {
    id: row.id,
    timestamp: row.createdAt.toISOString(),
    status: row.status === "FAILED" ? "FAILED" : "SENT",
    sentBy: row.sentBy,
    senderId: row.senderId,
    totalRecipients: row.totalRecipients,
    validRecipients: row.validRecipients,
    invalidRecipients: row.invalidRecipients,
    message: row.message,
    charCount: row.charCount,
    isUnicode: row.isUnicode,
    partsCount: row.partsCount,
    totalCreditsUsed: row.totalCreditsUsed,
    isSimulated: row.isSimulated,
    gatewayResponseCode: row.gatewayResponseCode ?? undefined,
    messageId: row.messageId ?? undefined,
    error: row.error ?? undefined,
    sampleRecipients: recipients.slice(0, 5),
  };
}

export async function recordBroadcast(input: NewBroadcast): Promise<SmsBroadcastRecord> {
  const row = await prisma.smsBroadcast.create({
    data: {
      status: input.status,
      sentBy: input.sentBy.slice(0, 254),
      senderId: input.senderId.slice(0, 40),
      message: input.message,
      charCount: input.charCount,
      isUnicode: input.isUnicode,
      partsCount: input.partsCount,
      totalRecipients: input.totalRecipients,
      validRecipients: input.validRecipients,
      invalidRecipients: input.invalidRecipients,
      totalCreditsUsed: input.totalCreditsUsed,
      isSimulated: input.isSimulated,
      gatewayResponseCode: input.gatewayResponseCode ?? null,
      messageId: input.messageId === undefined ? null : String(input.messageId).slice(0, 100),
      error: input.error ?? null,
      recipients: input.recipients as Prisma.InputJsonValue,
    },
  });
  return toRecord(row);
}

export async function listBroadcasts(limit = 100): Promise<SmsBroadcastRecord[]> {
  const rows = await prisma.smsBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toRecord);
}
