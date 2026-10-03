/**
 * SSGHS Alumni Association — SSLCommerz Payment Gateway Integration
 * 
 * SSLCommerz is Bangladesh's largest payment aggregator.
 * Supports: Visa, Mastercard, AMEX, DBBL Nexus, Rocket, Upay, bKash, Nagad, Internet Banking.
 * 
 * API Documentation: https://developer.sslcommerz.com/doc/v4/
 * 
 * Flow:
 * 1. Session Initiation (server-side, returns GatewayPageURL)
 * 2. Redirect customer to GatewayPageURL
 * 3. SSLCommerz redirects back to success/fail/cancel URL with POST data
 * 4. IPN (Instant Payment Notification) webhook for server-to-server confirmation
 * 5. Transaction validation API for final verification
 */

import crypto from "node:crypto";
import type {
  GatewayConfig,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
} from "./types";

// ── SSLCommerz Configuration ─────────────────────────────────────────
function getSSLCommerzConfig(): GatewayConfig {
  const isSandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
  return {
    baseUrl: isSandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com",
    storeId: process.env.SSLCOMMERZ_STORE_ID || "",
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    isSandbox,
  };
}

/**
 * Step 1: Initiate SSLCommerz Session
 * Creates a payment session and returns the gateway redirect URL.
 */
export async function initiateSession(
  req: PaymentInitiateRequest
): Promise<PaymentInitiateResponse> {
  try {
    const config = getSSLCommerzConfig();

    if (!config.storeId || !config.storePassword) {
      return {
        success: false,
        error:
          "[SSLCommerz] Missing credentials. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in .env",
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const tranId = `SSGHS-SSL-${Date.now().toString(36).toUpperCase()}`;

    // Build form data for SSLCommerz session API
    const formData = new URLSearchParams({
      store_id: config.storeId,
      store_passwd: config.storePassword,
      total_amount: req.amount.toFixed(2),
      currency: "BDT",
      tran_id: tranId,
      success_url: `${appUrl}/api/payments/sslcommerz/success`,
      fail_url: `${appUrl}/api/payments/sslcommerz/fail`,
      cancel_url: `${appUrl}/api/payments/sslcommerz/cancel`,
      ipn_url: `${appUrl}/api/payments/sslcommerz/ipn`,
      shipping_method: "NO",
      product_name: "SSGHS Alumni Donation",
      product_category: "Donation",
      product_profile: "non-physical-goods",
      cus_name: req.donorName,
      cus_email: req.donorEmail || "alumni@sabujsghs.edu.bd",
      cus_phone: req.donorPhone || "01700000000",
      cus_add1: "Chattogram, Bangladesh",
      cus_city: "Chattogram",
      cus_country: "Bangladesh",
      value_a: req.donationId,     // Pass donationId in custom field
      value_b: req.campaignId,     // Pass campaignId in custom field
      value_c: String(req.donorBatch || ""),
      value_d: req.isAnonymous ? "true" : "false",
    });

    const response = await fetch(
      `${config.baseUrl}/gwprocess/v4/api.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const data = await response.json();

    if (data.status === "SUCCESS" && data.GatewayPageURL) {
      return {
        success: true,
        gatewayUrl: data.GatewayPageURL,
        paymentId: data.sessionkey,
        transactionRef: tranId,
        merchantInvoice: tranId,
      };
    }

    return {
      success: false,
      error: data.failedreason || "SSLCommerz session initiation failed",
      errorCode: data.status,
    };
  } catch (error) {
    console.error("[SSLCommerz] Initiate session error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SSLCommerz error",
    };
  }
}

/**
 * Validate transaction from SSLCommerz
 * Use this to verify the payment after receiving callback/IPN.
 */
export async function validateTransaction(
  valId: string
): Promise<PaymentVerifyResponse> {
  try {
    const config = getSSLCommerzConfig();

    const validationUrl = `${config.baseUrl}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${config.storeId}&store_passwd=${config.storePassword}&format=json`;

    const response = await fetch(validationUrl);
    const data = await response.json();

    const isValid =
      data.status === "VALID" || data.status === "VALIDATED";

    return {
      success: true,
      verified: isValid,
      status: isValid ? "COMPLETED" : "FAILED",
      gatewayTrxId: data.bank_tran_id || data.tran_id,
      merchantInvoice: data.tran_id,
      donationId: data.value_a,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      currency: data.currency,
      paidAt: data.tran_date,
    };
  } catch (error) {
    console.error("[SSLCommerz] Validate transaction error:", error);
    return {
      success: false,
      verified: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate IPN hash from SSLCommerz webhook
 * This ensures the IPN callback is authentic and not tampered with.
 */
export function validateIPNHash(
  ipnData: Record<string, string>
): boolean {
  const config = getSSLCommerzConfig();

  // SSLCommerz sends verify_sign and verify_key
  const verifySign = ipnData.verify_sign;
  const verifyKey = ipnData.verify_key;

  if (!verifySign || !verifyKey) {
    return false;
  }

  // Build string from verify_key fields
  const keyFields = verifyKey.split(",");
  const hashInput = keyFields
    .map((key) => `${key}=${ipnData[key] || ""}`)
    .join("&");

  const finalInput = `${hashInput}&store_passwd=${
    // MD5 hash of store password as required by SSLCommerz
    crypto
      .createHash("md5")
      .update(config.storePassword || "")
      .digest("hex")
  }`;

  const computedHash = crypto
    .createHash("md5")
    .update(finalInput)
    .digest("hex");

  return computedHash === verifySign;
}
