import type { Metadata } from "next";
import IdCardBulkPrint from "@/components/admin/IdCardBulkPrint";

export const metadata: Metadata = { title: "ID card printing" };

// Print membership ID cards for many approved members at once (A4 sheets).
export default function IdCardPrintingPage() {
  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-5xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">ID card printing</h1>
        <p className="text-xs text-slate-500 mt-1">
          Choose approved members, then print their membership cards on A4 paper at actual size (85.6 × 54 mm, bank-card size). Each card carries its own gate QR code.
        </p>
      </div>
      <IdCardBulkPrint />
    </div>
  );
}
