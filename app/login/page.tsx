"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn, signOut } from "next-auth/react";
import { canUseAdminPanel, homeForRole } from "@/lib/permissions";
import { schoolInfo } from "@/lib/data";
import { MEMBERSHIP_REJECTED_MESSAGE, PENDING_BANNER_MESSAGE } from "@/lib/account-access";
import { ArrowRight, UserCheck, Lock, Mail, AlertCircle } from "lucide-react";
import PasswordInput from "@/components/shared/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only paths on this site: never redirect to another site after sign-in.
  const requested = searchParams.get("callbackUrl");
  const callbackUrl = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const blocked = searchParams.get("blocked");
  const [errorMessage, setErrorMessage] = useState(
    blocked === "pending" ? PENDING_BANNER_MESSAGE : blocked === "rejected" ? MEMBERSHIP_REJECTED_MESSAGE : ""
  );

  // Sent here by the proxy with a session that is no longer allowed: drop it.
  useEffect(() => {
    if (blocked) void signOut({ redirect: false });
  }, [blocked]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        // authorize() throws user-facing messages (bad credentials, database down);
        // "CredentialsSignin" is NextAuth's generic code when there is no message.
        setErrorMessage(
          res.error === "CredentialsSignin"
            ? "Invalid email or password. Please verify your credentials."
            : res.error
        );
        setLoading(false);
      } else {
        // Back to the page that asked for sign-in; otherwise staff to their admin
        // section and members to their dashboard.
        const role = (await getSession())?.user?.role;
        router.push(callbackUrl ?? (canUseAdminPanel(role) ? homeForRole(role) : "/dashboard"));
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#041a13] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center px-4">
        {/* School Crest */}
        <Link href="/" className="inline-flex items-center justify-center group mb-4">
          <div className="w-16 h-16 rounded-full p-1 shadow-xl flex items-center justify-center ring-2 ring-amber-400/60 bg-white overflow-hidden group-hover:scale-105 transition-transform">
            <NextImage
              src="/logo.png"
              alt="SSGHS Alumni Association Official Crest"
              width={64}
              height={64}
              className="w-full h-full object-contain rounded-full"
              priority
            />
          </div>
        </Link>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          SSGHS Alumni Association
        </h2>
        <p className="text-xs text-emerald-300 mt-1">
          Sabuj Shikshayatan Govt. High School • EIIN: 105070
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-emerald-800/40">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label htmlFor="login-email" className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumnus@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800 text-base sm:text-xs"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800 text-base sm:text-xs"
                />
              </div>
            </div>

            <p className="text-xs text-slate-600 pt-1">
              Forgot your password?{" "}
              <a href={`mailto:${schoolInfo.associationEmail}?subject=${encodeURIComponent("Password reset")}`} className="font-semibold text-emerald-700 hover:text-emerald-800 underline">
                Ask the committee to reset it
              </a>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? "Signing In..." : "Sign In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 text-center text-xs text-slate-600 border-t border-slate-100">
            <p className="text-slate-500 mb-2">New graduate or haven&apos;t registered yet?</p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 font-bold text-xs transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Join the Alumni Association (Register)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#041a13] flex items-center justify-center text-emerald-400 text-xs font-semibold">
          Loading authentication portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
