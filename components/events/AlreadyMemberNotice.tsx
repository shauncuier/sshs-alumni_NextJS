import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { schoolInfo } from "@/lib/data";

/**
 * Shown instead of the registration form to an approved member on the membership
 * (Golden Jubilee) event: joining is paying for it, so they have paid already. The
 * server refuses a second payment too (ALREADY_MEMBER in lib/events/registrations.ts).
 */
export default function AlreadyMemberNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div role="status" className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs sm:text-sm text-emerald-950 space-y-2">
      <p className="font-bold flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <span>You are already a member: your Golden Jubilee registration is paid.</span>
      </p>
      {!compact && (
        <p lang="bn" className="text-emerald-900">আপনি ইতিমধ্যে সদস্য, তাই আবার ফি দেওয়ার প্রয়োজন নেই।</p>
      )}
      <p className="text-emerald-900">
        Please do not pay again. Your ticket is on your{" "}
        <Link href="/dashboard" className="font-bold underline">
          dashboard
        </Link>
        ; if it is missing, write to the committee at{" "}
        <a href={`mailto:${schoolInfo.associationEmail}`} className="font-bold underline break-all">
          {schoolInfo.associationEmail}
        </a>
        .
      </p>
    </div>
  );
}
