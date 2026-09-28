import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ErrorScreen, { errorActionPrimary, errorActionSecondary } from "@/components/shared/ErrorScreen";
import { Compass, Home, Search, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ErrorScreen
          code="404"
          title="Page Not Found"
          icon={<Compass className="w-12 h-12" />}
          message="We couldn't find the page, alumnus or event you were looking for. It may have moved, or the link may be out of date."
        >
          <Link href="/" className={errorActionPrimary}>
            <Home className="w-4 h-4" /> Return to Homepage
          </Link>
          <Link href="/alumni" className={errorActionSecondary}>
            <Search className="w-4 h-4 text-slate-400" /> Alumni Directory
          </Link>
          <Link href="/events" className={errorActionSecondary}>
            <CalendarDays className="w-4 h-4 text-slate-400" /> Events
          </Link>
        </ErrorScreen>
      </main>

      <Footer />
    </div>
  );
}
