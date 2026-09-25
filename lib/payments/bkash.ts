/**
 * SSGHS Alumni Association — bKash Tokenized Checkout Integration
 * 
 * bKash Tokenized Checkout API v1.2.0-beta
 * Documentation: https://developer.bka.sh/docs/checkout-process-overview
 * 
 * Flow:
 * 1. Grant Token (server-to-server auth)
 * 2. Create Payment (get bkashURL for redirect)
 * 3. User completes payment on bKash page
 * 4. Execute Payment on callback
 * 5. Query Payment for verification
 */

import type {
  GatewayConfig,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
} from "./types";

// ── bKash Configuration ──────────────────────────────────────────────
function getBkashConfig(): GatewayConfig {
  const isSandbox = process.env.BKASH_SANDBOX !== "false";
  return {
    baseUrl: isSandbox
      ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
      : "https://tokenized.pay.bka.sh/v1.2.0-beta",
    appKey: process.env.BKASH_APP_KEY || "",
    appSecret: process.env.BKASH_APP_SECRET || "",
    username: process.env.BKASH_USERNAME || "",
    password: process.env.BKASH_PASSWORD || "",
    isSandbox,
  };
}

// ── Token Cache (in-memory, refreshed on expiry) ─────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Step 1: Grant Token
 * Authenticates with bKash and retrieves an id_token.
 * Tokens are cached in memory and refreshed 60s before expiry.
 */
export async function grantToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const config = getBkashConfig();

  if (!config.appKey || !config.appSecret || !config.username || !config.password) {
    throw new Error(
      "[bKash] Missing credentials. Set BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD in .env"
    );
  }

  const response = await fetch(`${config.baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[bKash] Token grant failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.statusCode !== "0000" && !data.id_token) {
    throw new Error(`[bKash] Token grant error: ${data.statusMessage || JSON.stringify(data)}`);
  }

  // Cache token (bKash tokens typically expire in 3600s)
  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    token: data.id_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return data.id_token;
}

/**
 * Step 2: Create Payment
 * Creates a payment session and returns the bKash checkout URL for user redirect.
 */
export async function createPayment(
  req: PaymentInitiateRequest
): Promise<PaymentInitiateResponse> {
  try {
    const config = getBkashConfig();
    const token = await grantToken();
    const merchantInvoice = `SSGHS-${Date.now().toString(36).toUpperCase()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${config.baseUrl}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": config.appKey!,
      },
      body: JSON.stringify({
        mode: "0011",  // Checkout URL mode
        payerReference: req.donorPhone || req.donorEmail || "anonymous",
        callbackURL: `${appUrl}/api/payments/bkash/callback`,
        amount: req.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: merchantInvoice,
      }),
    });

    const data = await response.json();

    if (data.statusCode !== "0000" && !data.bkashURL) {
      return {
        success: false,
        error: data.statusMessage || "bKash payment creation failed",
        errorCode: data.statusCode,
      };
    }

    return {
      success: true,
      gatewayUrl: data.bkashURL,
      paymentId: data.paymentID,
      transactionRef: data.paymentID,
      merchantInvoice,
    };
  } catch (error) {
    console.error("[bKash] Create payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown bKash error",
    };
  }
}

/**
 * Step 3: Execute Payment
 * Called after user completes payment on bKash page.
 * The bKash callback sends paymentID which we execute to confirm.
 */
export async function executePayment(paymentId: string): Promise<PaymentVerifyResponse> {
  try {
    const config = getBkashConfig();
    const token = await grantToken();

    const response = await fetch(`${config.baseUrl}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": config.appKey!,
      },
      body: JSON.stringify({ paymentID: paymentId }),
    });

    const data = await response.json();

    if (data.statusCode !== "0000") {
      return {
        success: false,
        verified: false,
        status: "FAILED",
        error: data.statusMessage || "bKash execution failed",
      };
    }

    return {
      success: true,
      verified: true,
      status: "COMPLETED",
      gatewayTrxId: data.trxID,
      amount: parseFloat(data.amount),
      paidAt: data.paymentExecuteTime || new Date().toISOString(),
    };
  } catch (error) {
    console.error("[bKash] Execute payment error:", error);
    return {
      success: false,
      verified: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Step 4: Query Payment (verification/status check)
 */
export async function queryPayment(paymentId: string): Promise<PaymentVerifyResponse> {
  try {
    const config = getBkashConfig();
    const token = await grantToken();

    const response = await fetch(
      `${config.baseUrl}/tokenized/checkout/payment/status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: token,
          "X-APP-Key": config.appKey!,
        },
        body: JSON.stringify({ paymentID: paymentId }),
      }
    );

    const data = await response.json();
    const isCompleted = data.transactionStatus === "Completed";

    return {
      success: true,
      verified: isCompleted,
      status: isCompleted ? "COMPLETED" : "PENDING",
      gatewayTrxId: data.trxID,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      paidAt: data.paymentExecuteTime,
    };
  } catch (error) {
    console.error("[bKash] Query payment error:", error);
    return {
      success: false,
      verified: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
