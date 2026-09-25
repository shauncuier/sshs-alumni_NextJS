/**
 * SSGHS Alumni Association — Unified Payment Service
 * 
 * Orchestrates payment initiation across all supported gateways:
 * - bKash Tokenized Checkout
 * - Nagad Merchant API
 * - SSLCommerz (Cards, Internet Banking, Rocket, Upay)
 * 
 * Used by: /api/payments/initiate
 */

import { createPayment as bkashCreate } from "./bkash";
import { initializePayment as nagadInit } from "./nagad";
import { initiateSession as sslcommerzInit } from "./sslcommerz";
import type {
  PaymentGatewayType,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
} from "./types";

/**
 * Route payment initiation to the correct gateway based on selected method.
 */
export async function initiatePayment(
  req: PaymentInitiateRequest
): Promise<PaymentInitiateResponse> {
  const gateway = req.paymentGateway;

  switch (gateway) {
    case "BKASH":
      return bkashCreate(req);

    case "NAGAD":
      return nagadInit(req);

    case "SSLCOMMERZ":
      return sslcommerzInit(req);

    case "BANK_TRANSFER":
      // Bank transfer is manual — generate instructions
      return {
        success: true,
        transactionRef: `SSGHS-BNK-${Date.now().toString(36).toUpperCase()}`,
        merchantInvoice: `SSGHS-BNK-${Date.now().toString(36).toUpperCase()}`,
      };

    case "MANUAL":
      return {
        success: true,
        transactionRef: `SSGHS-MNL-${Date.now().toString(36).toUpperCase()}`,
        merchantInvoice: `SSGHS-MNL-${Date.now().toString(36).toUpperCase()}`,
      };

    default:
      return {
        success: false,
        error: `Unsupported payment gateway: ${gateway}`,
      };
  }
}

/**
 * Map user-friendly payment method names to gateway types
 */
export function resolveGateway(method: string): PaymentGatewayType {
  const normalized = method.toLowerCase().trim();

  if (normalized.includes("bkash") || normalized === "bkash") return "BKASH";
  if (normalized.includes("nagad") || normalized === "nagad") return "NAGAD";
  if (
    normalized.includes("card") ||
    normalized.includes("visa") ||
    normalized.includes("master") ||
    normalized.includes("ssl") ||
    normalized.includes("rocket") ||
    normalized.includes("upay") ||
    normalized.includes("internet")
  )
    return "SSLCOMMERZ";
  if (normalized.includes("bank")) return "BANK_TRANSFER";

  return "MANUAL";
}

// Re-export types for convenience
export type { PaymentGatewayType, PaymentInitiateRequest, PaymentInitiateResponse } from "./types";
