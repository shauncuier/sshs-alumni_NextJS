/**
 * Before and after capturing the guide video (design/guide-video/capture.py):
 *   npx tsx --env-file=.env.local design/guide-video/demo-data.ts start
 *     SMS test mode on (verification codes on screen, no SMS sent); remembers the time.
 *   npx tsx --env-file=.env.local design/guide-video/demo-data.ts cleanup
 *     deletes the sample member (sample.member@example.com), their registration and files,
 *     turns SMS test mode off and removes the activity log rows written since "start".
 * Only the sample account is touched.
 */
import fs from "node:fs";
import path from "node:path";
import prisma from "@/lib/prisma";
import { setSmsTestMode } from "@/lib/sms-test-mode";
import { uploadsRoot } from "@/lib/media/avatars";

const SAMPLE_EMAIL = "sample.member@example.com";
const STAMP = path.join(process.cwd(), "design", "guide-video", ".capture-start");

async function main() {
  const cmd = process.argv[2];
  if (cmd === "start") {
    fs.writeFileSync(STAMP, new Date().toISOString());
    await setSmsTestMode(true, "guide-video");
    console.log("SMS test mode on");
  } else if (cmd === "cleanup") {
    const user = await prisma.user.findUnique({
      where: { email: SAMPLE_EMAIL },
      select: { id: true, profile: { select: { avatarUrl: true, avatarOriginalUrl: true } }, verificationRequests: { select: { proofFileUrl: true } } },
    });
    if (user) {
      const dirs = [user.profile?.avatarUrl, user.profile?.avatarOriginalUrl, ...user.verificationRequests.map((v) => v.proofFileUrl)]
        .map((u) => /^\/api\/media\/(avatars|proofs)\/([A-Za-z0-9-]+)\//.exec(u ?? ""))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => path.join(uploadsRoot(), m[1], m[2]));
      await prisma.eventToken.deleteMany({ where: { registration: { userId: user.id } } });
      await prisma.eventRegistration.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      for (const d of new Set(dirs)) fs.rmSync(d, { recursive: true, force: true });
      console.log(`deleted the sample member and ${new Set(dirs).size} upload folder(s)`);
    }
    await setSmsTestMode(false, "guide-video");
    if (fs.existsSync(STAMP)) {
      const since = new Date(fs.readFileSync(STAMP, "utf8"));
      const { count } = await prisma.activityLog.deleteMany({ where: { createdAt: { gte: since } } });
      fs.rmSync(STAMP);
      console.log(`removed ${count} activity log row(s) from the capture`);
    }
    await prisma.setting.deleteMany({ where: { key: "sms-test-mode" } });
    console.log("SMS test mode off");
  } else {
    console.log("usage: demo-data.ts start | cleanup");
  }
  await prisma.$disconnect();
}

main();
