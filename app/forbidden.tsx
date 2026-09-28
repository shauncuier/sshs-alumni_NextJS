import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";
import { ShieldAlert, LayoutDashboard, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Access Restricted",
};

// Rendered with a 403 status when a page calls forbidden(), e.g. a member opening /admin.
export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ErrorScreen
          code="403"
          tone="amber"
          title="Administrators Only"
          icon={<ShieldAlert className="w-12 h-12" />}
          message="You're signed in, but this area is reserved for the alumni association's administrators. If you should have access, ask the executive committee to grant your account an administrator role."
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
