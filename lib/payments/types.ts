/**
 * SSGHS Alumni Association — Payment Gateway Type Definitions
 * Shared types used across bKash, Nagad, SSLCommerz payment integrations.
 */

export type PaymentGatewayType = "BKASH" | "NAGAD" | "SSLCOMMERZ" | "BANK_TRANSFER" | "MANUAL";

export type PaymentStatusType =
  | "INITIATED"
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface PaymentInitiateRequest {
  donationId: string;
  campaignId: string;
  amount: number;
  currency?: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donorBatch?: number;
  paymentGateway: PaymentGatewayType;
  isAnonymous?: boolean;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  gatewayUrl?: string;        // URL to redirect user to for payment completion
  paymentId?: string;          // Gateway-generated payment/session ID
  transactionRef?: string;     // Our internal transaction reference
  merchantInvoice?: string;    // Invoice number sent to gateway
  error?: string;
  errorCode?: string;
}

export interface PaymentCallbackData {
  gateway: PaymentGatewayType;
  gatewayTrxId?: string;
  paymentId?: string;
  status: PaymentStatusType;
  amount?: number;
  customerMsisdn?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentVerifyResponse {
  success: boolean;
  verified: boolean;
  status: PaymentStatusType;
  gatewayTrxId?: string;
  amount?: number;
  paidAt?: string;
  error?: string;
}

export interface GatewayConfig {
  baseUrl: string;
  appKey?: string;
  appSecret?: string;
  username?: string;
  password?: string;
  storeId?: string;
  storePassword?: string;
  isSandbox: boolean;
}

/**
 * Receipt data for PDF generation
 */
export interface DonationReceipt {
  receiptId: string;
  donorName: string;
  donorBatch?: number;
  campaignTitle: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gatewayTrxId?: string;
  paidAt: string;
  schoolName: string;
  schoolEIIN: string;
}
