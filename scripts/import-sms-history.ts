import "../lib/load-env";
import fs from "node:fs/promises";
import path from "node:path";

// One-time move of bulk SMS history from the old sms-history.json file (under
// UPLOADS_DIR, or ./uploads) into the SmsBroadcast table. Safe to run again:
// entries already imported are skipped.
type OldRecord = {
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
  sampleRecipients?: string[];
};

async function main() {
  const { default: prisma } = await import("../lib/prisma");
  const root = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
  const file = path.join(root, "sms-history.json");
  let items: OldRecord[];
  try {
    items = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    console.log(`No ${file}; nothing to import.`);
    process.exit(0);
  }

  let imported = 0;
  for (const r of items) {
    const id = String(r.id).slice(0, 64);
    if (await prisma.smsBroadcast.findUnique({ where: { id }, select: { id: true } })) continue;
    await prisma.smsBroadcast.create({
      data: {
        id,
        createdAt: new Date(r.timestamp),
        status: "SENT",
        sentBy: String(r.sentBy).slice(0, 254),
        senderId: String(r.senderId).slice(0, 40),
        message: r.message,
        charCount: r.charCount,
        isUnicode: r.isUnicode,
        partsCount: r.partsCount,
        totalRecipients: r.totalRecipients,
        validRecipients: r.validRecipients,
        invalidRecipients: r.invalidRecipients,
        totalCreditsUsed: r.totalCreditsUsed,
        isSimulated: r.isSimulated,
        gatewayResponseCode: r.gatewayResponseCode ?? null,
        messageId: r.messageId === undefined ? null : String(r.messageId).slice(0, 100),
        // The old file kept only the first five numbers of each send.
        recipients: r.sampleRecipients ?? [],
      },
    });
    imported += 1;
  }
  console.log(`Imported ${imported} of ${items.length} SMS broadcast(s). You can now delete ${file}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
