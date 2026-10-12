/**
 * BulkSMSBD (bulksmsbd.net / bulksmsbd.com) Gateway Client
 * 
 * Provides official integration with Bangladesh's BulkSMSBD SMS service:
 * - Single and bulk SMS dispatch
 * - Phone number normalization (supports 01XXXXXXXXX, 8801XXXXXXXXX, with spaces/dashes)
 * - GSM-7 vs Unicode detection & segment counting
 * - Balance inquiry
 * - Simulated sandbox mode when API credentials are not yet configured
 */

export interface SmsMetrics {
  charCount: number;
  isUnicode: boolean;
  partsCount: number;
  charsPerPart: number;
  charsRemainingInPart: number;
}

export interface BulkSmsSendResult {
  success: boolean;
  isSimulated: boolean;
  responseCode?: number;
  message?: string;
  messageId?: string | number;
  totalNumbers: number;
  validNumbers: string[];
  invalidNumbers: string[];
  error?: string;
  rawResponse?: unknown;
}

export interface SmsBalanceResult {
  success: boolean;
  balance: string;
  isSimulated: boolean;
  currency?: string;
  error?: string;
}

/**
 * Normalizes any Bangladeshi phone string into official format: 8801XXXXXXXXX
 */
export function normalizeBdPhoneNumber(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  // Extract all numeric digits
  const digits = raw.replace(/\D/g, "");

  // 13 digits starting with 8801 (e.g. 8801711234567)
  if (digits.length === 13 && digits.startsWith("8801")) {
    return digits;
  }

  // 11 digits starting with 01 (e.g. 01711234567) -> prepend 88
  if (digits.length === 11 && digits.startsWith("01")) {
    return `88${digits}`;
  }

  // 10 digits starting with 1 (e.g. 1711234567) -> prepend 880
  if (digits.length === 10 && digits.startsWith("1")) {
    return `880${digits}`;
  }

  // 14 digits starting with 008801 (e.g. 008801711234567)
  if (digits.length === 14 && digits.startsWith("008801")) {
    return digits.slice(2);
  }

  // General 880... 13 digits
  if (digits.length === 13 && digits.startsWith("880")) {
    return digits;
  }

  return null;
}

/**
 * Validates whether a phone number belongs to valid BD mobile operators:
 * 013, 014, 015, 016, 017, 018, 019
 */
export function isValidBdMobile(normalized: string): boolean {
  if (!normalized || normalized.length !== 13 || !normalized.startsWith("8801")) {
    return false;
  }
  const operatorDigit = normalized.charAt(4);
  // Operators: 3, 4, 5, 6, 7, 8, 9
  return ["3", "4", "5", "6", "7", "8", "9"].includes(operatorDigit);
}

/**
 * Determines whether text contains non-GSM-7 characters (like Bengali unicode)
 */
export function isUnicodeText(text: string): boolean {
  // Checks if any character falls outside standard GSM 7-bit charset
  // Standard GSM-7 basic regex
  const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
  return !gsmRegex.test(text);
}

/**
 * Calculates character count, unicode status, and SMS billing segment parts
 */
export function calculateSmsMetrics(message: string): SmsMetrics {
  const charCount = message.length;
  const isUnicode = isUnicodeText(message);

  if (charCount === 0) {
    return {
      charCount: 0,
      isUnicode,
      partsCount: 1,
      charsPerPart: isUnicode ? 70 : 160,
      charsRemainingInPart: isUnicode ? 70 : 160,
    };
  }

  if (isUnicode) {
    // Single SMS: up to 70 chars. Multi-part: 67 chars per part
    if (charCount <= 70) {
      return {
        charCount,
        isUnicode,
        partsCount: 1,
        charsPerPart: 70,
        charsRemainingInPart: 70 - charCount,
      };
    }
    const partsCount = Math.ceil(charCount / 67);
    const charsRemainingInPart = partsCount * 67 - charCount;
    return {
      charCount,
      isUnicode,
      partsCount,
      charsPerPart: 67,
      charsRemainingInPart,
    };
  }

  // Standard GSM-7
  // Single SMS: up to 160 chars. Multi-part: 153 chars per part
  if (charCount <= 160) {
    return {
      charCount,
      isUnicode,
      partsCount: 1,
      charsPerPart: 160,
      charsRemainingInPart: 160 - charCount,
    };
  }
  const partsCount = Math.ceil(charCount / 153);
  const charsRemainingInPart = partsCount * 153 - charCount;
  return {
    charCount,
    isUnicode,
    partsCount,
    charsPerPart: 153,
    charsRemainingInPart,
  };
}

/**
 * Get configured BulkSMSBD settings from environment
 */
export function getBulkSmsConfig() {
  const apiKey =
    process.env.BULKSMSBD_API_KEY ||
    process.env.SMS_API_KEY ||
    "";

  const senderId =
    process.env.BULKSMSBD_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    "SSGHS";

  const apiUrl =
    process.env.BULKSMSBD_URL ||
    process.env.SMS_GATEWAY_URL ||
    "https://bulksmsbd.net/api/smsapi";

  const balanceUrl =
    process.env.BULKSMSBD_BALANCE_URL ||
    "https://bulksmsbd.net/api/getBalanceApi";

  const isConfigured = Boolean(apiKey && apiKey.trim() !== "");

  return {
    apiKey: apiKey.trim(),
    senderId: senderId.trim(),
    apiUrl: apiUrl.trim(),
    balanceUrl: balanceUrl.trim(),
    isConfigured,
  };
}

/**
 * Check BulkSMSBD balance
 */
export async function checkBulkSmsBalance(): Promise<SmsBalanceResult> {
  const config = getBulkSmsConfig();

  // If not configured, provide simulated sandbox balance
  if (!config.isConfigured) {
    return {
      success: true,
      balance: "500.00",
      isSimulated: true,
      currency: "BDT / Credits",
    };
  }

  try {
    const url = `${config.balanceUrl}?api_key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Some endpoints return plain text balance number
      if (!Number.isNaN(Number(text.trim()))) {
        return {
          success: true,
          balance: text.trim(),
          isSimulated: false,
          currency: "BDT / Credits",
        };
      }
    }

    if (data.response_code === 202 || data.balance !== undefined) {
      return {
        success: true,
        balance: String(data.balance ?? "0"),
        isSimulated: false,
        currency: "BDT / Credits",
      };
    }

    return {
      success: false,
      balance: "0.00",
      isSimulated: false,
      error: (data.error_message as string) || (data.message as string) || `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("[BulkSMSBD] Failed to fetch balance:", error);
    return {
      success: false,
      balance: "0.00",
      isSimulated: false,
      error: error instanceof Error ? error.message : "Failed to connect to BulkSMSBD",
    };
  }
}

/**
 * Send SMS to one or multiple phone numbers via BulkSMSBD
 */
export async function sendBulkSms({
  numbers,
  message,
  senderIdOverride,
}: {
  numbers: string[];
  message: string;
  senderIdOverride?: string;
}): Promise<BulkSmsSendResult> {
  const config = getBulkSmsConfig();
  const senderId = senderIdOverride || config.senderId;

  // Process and normalize numbers
  const validNumbers: string[] = [];
  const invalidNumbers: string[] = [];
  const seen = new Set<string>();

  for (const raw of numbers) {
    const normalized = normalizeBdPhoneNumber(raw);
    if (normalized && isValidBdMobile(normalized)) {
      if (!seen.has(normalized)) {
        seen.add(normalized);
        validNumbers.push(normalized);
      }
    } else {
      invalidNumbers.push(raw);
    }
  }

  if (validNumbers.length === 0) {
    return {
      success: false,
      isSimulated: !config.isConfigured,
      totalNumbers: numbers.length,
      validNumbers: [],
      invalidNumbers,
      error: "No valid Bangladeshi mobile numbers found in recipient list.",
    };
  }

  if (!message || message.trim() === "") {
    return {
      success: false,
      isSimulated: !config.isConfigured,
      totalNumbers: validNumbers.length,
      validNumbers,
      invalidNumbers,
      error: "SMS message content cannot be empty.",
    };
  }

  // If API key is not configured, simulate successful dispatch in Sandbox mode
  if (!config.isConfigured) {
    const simulatedBatchId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[BulkSMSBD Sandbox] Simulated Bulk SMS Dispatch:
      - Batch ID: ${simulatedBatchId}
      - Sender ID: ${senderId}
      - Recipients: ${validNumbers.length} numbers (${validNumbers.slice(0, 3).join(", ")}${validNumbers.length > 3 ? "..." : ""})
      - Message: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}
    `);

    return {
      success: true,
      isSimulated: true,
      responseCode: 202,
      message: "SMS Submitted Successfully (Sandbox Simulation)",
      messageId: simulatedBatchId,
      totalNumbers: validNumbers.length,
      validNumbers,
      invalidNumbers,
    };
  }

  // Dispatch to BulkSMSBD API
  try {
    // BulkSMSBD accepts comma-separated numbers in 'number' parameter
    // If list is large (e.g. >200), we chunk it in batches of 100
    const chunkSize = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < validNumbers.length; i += chunkSize) {
      chunks.push(validNumbers.slice(i, i + chunkSize));
    }

    let lastResponseCode = 202;
    let lastMessage = "SMS Submitted Successfully";
    let lastMessageId: string | number = "";
    let lastRaw: unknown = null;

    for (const chunk of chunks) {
      const numberParam = chunk.join(",");

      // BulkSMSBD supports POST with JSON or URL-encoded form
      const postBody = new URLSearchParams({
        api_key: config.apiKey,
        senderid: senderId,
        number: numberParam,
        message,
      });

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: postBody.toString(),
      });

      const text = await response.text();
      let resJson: Record<string, unknown> = {};
      try {
        resJson = JSON.parse(text);
      } catch {
        resJson = { raw: text };
      }

      lastRaw = resJson;

      // BulkSMSBD Response Codes:
      // 202: Success
      // 1002: Sender ID invalid
      // 1007: Insufficient Balance
      // 1011: User ID not found
      // 1012: Masking SMS must be in Bengali
      const code = Number(resJson.response_code ?? response.status);
      lastResponseCode = code;

      if (code !== 202) {
        const errorDetail =
          (resJson.error_message as string) ||
          (resJson.message as string) ||
          getBulkSmsErrorMessage(code);
        return {
          success: false,
          isSimulated: false,
          responseCode: code,
          totalNumbers: validNumbers.length,
          validNumbers,
          invalidNumbers,
          error: errorDetail,
          rawResponse: resJson,
        };
      }

      lastMessage = (resJson.success_message as string) || "SMS Submitted Successfully";
      lastMessageId = (resJson.message_id as string | number) || Date.now();
    }

    return {
      success: true,
      isSimulated: false,
      responseCode: lastResponseCode,
      message: lastMessage,
      messageId: lastMessageId,
      totalNumbers: validNumbers.length,
      validNumbers,
      invalidNumbers,
      rawResponse: lastRaw,
    };
  } catch (error) {
    console.error("[BulkSMSBD] Send API error:", error);
    return {
      success: false,
      isSimulated: false,
      totalNumbers: validNumbers.length,
      validNumbers,
      invalidNumbers,
      error: error instanceof Error ? error.message : "Failed to communicate with BulkSMSBD API",
    };
  }
}

/**
 * Standard BulkSMSBD response code explanations
 */
export function getBulkSmsErrorMessage(code: number): string {
  switch (code) {
    case 1002:
      return "Sender ID is incorrect, pending approval, or disabled in BulkSMSBD portal.";
    case 1003:
      return "Required parameters are missing (API key, senderid, number or message).";
    case 1004:
      return "Invalid API Key or authentication failure.";
    case 1007:
      return "Insufficient account balance in BulkSMSBD.";
    case 1011:
      return "User account or ID not found.";
    case 1012:
      return "Sender ID configured as Bengali-only masking. Message must contain Bengali text.";
    case 1013:
      return "Recipient phone number parameter is empty or improperly formatted.";
    case 1014:
      return "SMS message body is empty.";
    default:
      return `BulkSMSBD Gateway Error (Code ${code}).`;
  }
}
