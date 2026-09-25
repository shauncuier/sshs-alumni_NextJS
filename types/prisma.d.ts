/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@prisma/client" {
  export class PrismaClient {
    constructor(options?: any);
    user: any;
    alumniProfile: any;
    batch: any;
    event: any;
    post: any;
    comment: any;
    donationCampaign: any;
    donation: any;
    paymentTransaction: any;
    message: any;
    notification: any;
    verificationRequest: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }

  export enum Role {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    MODERATOR = "MODERATOR",
    ALUMNI = "ALUMNI",
  }

  export enum VerificationStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED",
  }

  export enum PaymentStatus {
    INITIATED = "INITIATED",
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
  }

  export enum PaymentGateway {
    BKASH = "BKASH",
    NAGAD = "NAGAD",
    SSLCOMMERZ = "SSLCOMMERZ",
    BANK_TRANSFER = "BANK_TRANSFER",
    MANUAL = "MANUAL",
  }
}
