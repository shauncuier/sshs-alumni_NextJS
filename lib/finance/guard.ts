import { AppError } from "@/lib/app-error";
import { requireArea } from "@/lib/admin/require-admin";
import { canApproveFinance } from "./entries";

/** Someone who uses the accounts: the treasurer or an administrator. */
export const requireFinance = () => requireArea("accounts", "You do not have access to the accounts.");

/** An administrator: approves vouchers, changes accounts and opening balances, runs sync. */
export async function requireFinanceAdmin(message = "Only an administrator can do this in the accounts.") {
  const me = await requireFinance();
  if (!canApproveFinance(me.role)) throw new AppError("FORBIDDEN", 403, message);
  return me;
}
