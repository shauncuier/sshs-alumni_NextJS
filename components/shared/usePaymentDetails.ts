"use client";

import { useEffect, useState } from "react";

export interface PaymentDetails {
  /** Methods members can pay with right now, in display order. */
  methods: string[];
  lines: string[];
  bkashNumber: string | null;
  nagadNumber: string | null;
  banglaQrImage: string | null;
  banglaQrMerchant: string | null;
}

/** Where to send money, as set by the committee in /admin/payments. */
export function usePaymentDetails(): PaymentDetails | null {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  useEffect(() => {
    fetch("/api/payment-settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetails(data ?? { methods: [], lines: [], bkashNumber: null, nagadNumber: null, banglaQrImage: null, banglaQrMerchant: null }))
      .catch(() => setDetails({ methods: [], lines: [], bkashNumber: null, nagadNumber: null, banglaQrImage: null, banglaQrMerchant: null }));
  }, []);
  return details;
}
