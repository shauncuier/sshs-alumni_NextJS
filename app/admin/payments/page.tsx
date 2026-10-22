import type { Metadata } from "next";
import PaymentNoticeSwitches from "@/components/admin/PaymentNoticeSwitches";
import PaymentSettingsForm from "@/components/admin/PaymentSettingsForm";

export const metadata: Metadata = { title: "Payment settings" };

// One place for every payment method the site accepts (events, joining, donations).
export default function PaymentSettingsPage() {
  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Payment settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          bKash, Nagad, Bangla QR, bank and cash: switch each on or off and give its details. Members always pay manually and the committee checks every payment.
        </p>
      </div>
      <PaymentNoticeSwitches />
      <PaymentSettingsForm />
    </div>
  );
}
