import { NextResponse } from "next/server";
import { AppError } from "@/lib/app-error";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { requireArea } from "@/lib/admin/require-admin";
import { currentMode, standbyConfigured } from "@/lib/db-mode";
import { readLastStandbyRun } from "@/lib/standby-sync";
import { getStandbySyncSetting, setStandbySyncMinutes, STANDBY_SYNC_CHOICES } from "@/lib/standby-sync-setting";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";

const requireAdmin = () => requireArea("settings", "Only administrators can change the database settings.");

async function state() {
  return {
    ...(await getStandbySyncSetting()),
    choices: STANDBY_SYNC_CHOICES,
    configured: standbyConfigured(),
    mode: currentMode(),
    lastRun: await readLastStandbyRun(),
  };
}

// GET /api/admin/standby-sync: how often the standby copy runs, and what the last run did.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await state());
  } catch (err) {
    return errorResponse(err, "GET /api/admin/standby-sync");
  }
}

// PUT /api/admin/standby-sync { minutes }: change how often the standby copy runs.
export async function PUT(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const body = (await readJsonBody(req)) as { minutes?: unknown };
    const minutes = body?.minutes;
    if (typeof minutes !== "number" || !(STANDBY_SYNC_CHOICES as readonly number[]).includes(minutes)) {
      throw new AppError("INVALID_INPUT", 400, `Choose ${STANDBY_SYNC_CHOICES.join(", ")} minutes.`);
    }
    const before = await getStandbySyncSetting();
    await setStandbySyncMinutes(minutes, me.email);
    await logActivity({
      category: "SYSTEM",
      action: "standby_sync.updated",
      summary: `Standby copy every ${minutes} minutes (was ${before.minutes})`,
      actor: me,
      targetType: "Setting",
      targetId: "standby-sync",
      metadata: { minutes: { from: before.minutes, to: minutes } },
      req,
    });
    return NextResponse.json(await state());
  } catch (err) {
    return errorResponse(err, "PUT /api/admin/standby-sync");
  }
}
