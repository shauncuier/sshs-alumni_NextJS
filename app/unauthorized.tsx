import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";
import { LogIn, Lock, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In Required",
};

// Rendered with a 401 status when a page calls unauthorized(). Most member pages
// redirect to /login in proxy.ts first; this covers anything that reaches the server.
export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ErrorScreen
          code="401"
          tone="slate"
          title="Sign In Required"
          icon={<Lock className="w-12 h-12" />}
          message="Please sign in with your alumni account to continue. New to the portal? Register and the committee will verify your membership."
        >
          <Link href="/login" className={errorActionPrimary}>
            <LogIn className="w-4 h-4" /> Sign In
          </Link>
          <Link href="/register" className={errorActionSecondary}>
            <UserPlus className="w-4 h-4 text-slate-400" /> Register
          </Link>
        </ErrorScreen>
      </main>

      <Footer />
    </div>
  );
}
