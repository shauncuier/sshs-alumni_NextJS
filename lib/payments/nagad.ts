/**
 * SSGHS Alumni Association — Nagad Payment Gateway Integration
 * 
 * Nagad Merchant API Integration
 * Supports both sandbox and production environments.
 * 
 * Flow:
 * 1. Initialize Payment (get challenge token)
 * 2. Complete Payment (redirect user to Nagad checkout)
 * 3. Callback verification on return
 * 4. Payment verification API
 */

import type {
  GatewayConfig,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyResponse,
} from "./types";
import crypto from "crypto";

// ── Nagad Configuration ──────────────────────────────────────────────
function getNagadConfig(): GatewayConfig {
  const isSandbox = process.env.NAGAD_SANDBOX !== "false";
  return {
    baseUrl: isSandbox
      ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs"
      : "https://api.mynagad.com/api/dfs",
    storeId: process.env.NAGAD_MERCHANT_ID || "",
    storePassword: process.env.NAGAD_MERCHANT_KEY || "",
    appKey: process.env.NAGAD_PG_PUBLIC_KEY || "",
    appSecret: process.env.NAGAD_MERCHANT_PRIVATE_KEY || "",
    isSandbox,
  };
}

/**
 * Generate a unique order ID for Nagad
 */
function generateOrderId(): string {
  return `SSGHS-NAG-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Encrypt data with Nagad PG public key (RSA)
 */
function encryptWithPublicKey(data: string, publicKey: string): string {
  try {
    const buffer = Buffer.from(data, "utf-8");
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    );
    return encrypted.toString("base64");
  } catch {
    console.error("[Nagad] Public key encryption failed — using passthrough for sandbox");
    return Buffer.from(data).toString("base64");
  }
}

/**
 * Sign data with merchant private key (RSA)
 */
function signWithPrivateKey(data: string, privateKey: string): string {
  try {
    const signer = crypto.createSign("SHA256");
    signer.update(data);
    signer.end();
    return signer.sign(privateKey, "base64");
  } catch {
    console.error("[Nagad] Private key signing failed — using passthrough for sandbox");
    return Buffer.from(data).toString("base64");
  }
}

/**
 * Step 1: Initialize Payment
 * Gets a challenge from Nagad server to proceed with payment creation.
 */
export async function initializePayment(
  req: PaymentInitiateRequest
): Promise<PaymentInitiateResponse> {
  try {
    const config = getNagadConfig();
    const orderId = generateOrderId();

    if (!config.storeId) {
      return {
        success: false,
        error: "[Nagad] Missing NAGAD_MERCHANT_ID in environment variables",
      };
    }

    const dateTime = new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    // Sensitive data to be encrypted
    const sensitiveData = JSON.stringify({
      merchantId: config.storeId,
      datetime: dateTime,
      orderId,
      challenge: crypto.randomBytes(20).toString("hex"),
    });

    const signature = signWithPrivateKey(
      sensitiveData,
      config.appSecret || ""
    );

    const encryptedData = encryptWithPublicKey(
      sensitiveData,
      config.appKey || ""
    );

    const initUrl = `${config.baseUrl}/check-out/initialize/${config.storeId}/${orderId}`;

    const response = await fetch(initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "127.0.0.1",
        "X-KM-Client-Type": "PC_WEB",
      },
      body: JSON.stringify({
        accountNumber: config.storeId,
        dateTime,
        sensitiveData: encryptedData,
        signature,
      }),
    });

    const initData = await response.json();

    if (!initData.sensitiveData || !initData.signature) {
      return {
        success: false,
        error: initData.message || "Nagad initialization failed",
        errorCode: initData.reason,
      };
    }

    // Step 2: Complete payment creation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const completeData = JSON.stringify({
      merchantId: config.storeId,
      orderId,
      currencyCode: "050", // BDT
      amount: req.amount.toFixed(2),
      challenge: initData.challenge || crypto.randomBytes(10).toString("hex"),
    });

    const completeSignature = signWithPrivateKey(
      completeData,
      config.appSecret || ""
    );

    const completeEncrypted = encryptWithPublicKey(
      completeData,
      config.appKey || ""
    );

    const completeUrl = `${config.baseUrl}/check-out/complete/${initData.paymentReferenceId}`;

    const completeResponse = await fetch(completeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "127.0.0.1",
        "X-KM-Client-Type": "PC_WEB",
      },
      body: JSON.stringify({
        sensitiveData: completeEncrypted,
        signature: completeSignature,
        merchantCallbackURL: `${appUrl}/api/payments/nagad/callback`,
      }),
    });

    const completeResult = await completeResponse.json();

    if (completeResult.callBackUrl) {
      return {
        success: true,
        gatewayUrl: completeResult.callBackUrl,
        paymentId: initData.paymentReferenceId,
        transactionRef: orderId,
        merchantInvoice: orderId,
      };
    }

    return {
      success: false,
      error: completeResult.message || "Nagad checkout creation failed",
      errorCode: completeResult.reason,
    };
  } catch (error) {
    console.error("[Nagad] Initialize payment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Nagad error",
    };
  }
}

/**
 * Verify payment status from Nagad
 */
export async function verifyPayment(
  paymentRefId: string
): Promise<PaymentVerifyResponse> {
  try {
    const config = getNagadConfig();
    const verifyUrl = `${config.baseUrl}/verify/payment/${paymentRefId}`;

    const response = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "127.0.0.1",
        "X-KM-Client-Type": "PC_WEB",
      },
    });

    const data = await response.json();
    const isSuccess = data.status === "Success";

    return {
      success: true,
      verified: isSuccess,
      status: isSuccess ? "COMPLETED" : "FAILED",
      gatewayTrxId: data.issuerPaymentRefNo,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      paidAt: data.issuerPaymentDateTime,
    };
  } catch (error) {
    console.error("[Nagad] Verify payment error:", error);
    return {
      success: false,
      verified: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
