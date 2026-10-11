import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";
import { ShieldAlert, LayoutDashboard, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Restricted",
};

// Rendered with a 403 status when a page calls forbidden(), e.g. a member opening
// /admin, or a moderator opening an admin-only section (lib/permissions.ts).
export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ErrorScreen
          code="403"
          tone="amber"
          title="Not Available for Your Account"
          icon={<ShieldAlert className="w-12 h-12" />}
          message="You're signed in, but your account's role does not include this page. Committee members see only the parts of the admin panel their role covers. If you need access, ask the executive committee."
        >
          <Link href="/dashboard" className={errorActionPrimary}>
            <LayoutDashboard className="w-4 h-4" /> My Dashboard
          </Link>
          <Link href="/" className={errorActionSecondary}>
            <Home className="w-4 h-4 text-slate-400" /> Homepage
          </Link>
        </ErrorScreen>
      </main>

      <Footer />
    </div>
  );
}
