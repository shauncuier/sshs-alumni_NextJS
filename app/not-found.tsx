import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { GraduationCap, ArrowLeft, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-200 shadow-md">
              <GraduationCap className="w-12 h-12 text-emerald-800" />
            </div>
            <span className="absolute -top-2 -right-2 px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full shadow">
              404
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find the alumni resource, reunion event, or page you were looking for. It may have moved or the link might be out of date.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Home className="w-4 h-4" /> Return to Homepage
            </Link>
            <Link
              href="/alumni"
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Search className="w-4 h-4 text-slate-400" /> Search Alumni Directory
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
