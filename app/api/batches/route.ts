import { NextResponse } from "next/server";
import { listBatches } from "@/lib/batches";

// GET /api/batches — every SSC batch with its verified member count and the
// representative details admins have set (none are invented).
export async function GET() {
  try {
    return NextResponse.json({ batches: await listBatches() });
  } catch (err) {
    console.error("Failed to load batches:", err);
    return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
  }
}
