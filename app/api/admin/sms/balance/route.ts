import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { checkBulkSmsBalance, getBulkSmsConfig } from "@/lib/bulksmsbd";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const config = getBulkSmsConfig();
    const balanceResult = await checkBulkSmsBalance();

    return NextResponse.json({
      success: balanceResult.success,
      balance: balanceResult.balance,
      isSimulated: balanceResult.isSimulated,
      currency: balanceResult.currency || "BDT / Credits",
      senderId: config.senderId,
      isConfigured: config.isConfigured,
      apiUrl: config.apiUrl,
      error: balanceResult.error,
    });
  } catch (error) {
    console.error("[API/Admin/SMS/Balance] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve SMS balance" },
      { status: 500 }
    );
  }
}
