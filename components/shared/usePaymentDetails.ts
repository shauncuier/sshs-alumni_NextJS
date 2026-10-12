"use client";

import { useEffect, useState } from "react";

export interface PaymentDetails {
  lines: string[];
  bkashNumber: string | null;
  nagadNumber: string | null;
  banglaQrImage: string | null;
  banglaQrMerchant: string | null;
}

/** Where to send money, as set by the committee in /admin/donations. */
export function usePaymentDetails(): PaymentDetails | null {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  useEffect(() => {
    fetch("/api/payment-settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetails(data ?? { lines: [], bkashNumber: null, nagadNumber: null, banglaQrImage: null, banglaQrMerchant: null }))
      .catch(() => setDetails({ lines: [], bkashNumber: null, nagadNumber: null, banglaQrImage: null, banglaQrMerchant: null }));
  }, []);
  return details;
}
