"use client";

import React, { useEffect, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { Lock, Bell, Eye, CheckCircle2 } from "lucide-react";

type Visibility = "public" | "hidden";

export default function SettingsPage() {
  // Privacy is stored on the member's profile; load the real values before editing.
  const [phoneVisibility, setPhoneVisibility] = useState<Visibility | null>(null);
  const [emailVisibility, setEmailVisibility] = useState<Visibility | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.profile) throw new Error(body.error || "Could not load your settings.");
        setPhoneVisibility(body.profile.isPhonePublic ? "public" : "hidden");
        setEmailVisibility(body.profile.isEmailPublic ? "public" : "hidden");
      })
      .catch((err: Error) => setPrivacyError(err.message));
  }, []);

  const handlePrivacySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneVisibility || !emailVisibility) return;
    setPrivacySaving(true);
    setPrivacyError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPhonePublic: phoneVisibility === "public",
          isEmailPublic: emailVisibility === "public",
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save your privacy settings.");
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2500);
    } catch (err) {
      setPrivacyError((err as Error).message);
    } finally {
      setPrivacySaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not change your password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const selectClass =
    "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60";
  const inputClass =
    "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600";

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Account & Privacy Settings" />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          {/* Privacy Section */}
          <form
            onSubmit={handlePrivacySave}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Eye className="w-5 h-5 text-emerald-700" />
              <span>Directory &amp; Profile Privacy</span>
            </div>

            <p className="text-xs text-slate-500">
              The alumni directory is public: anyone visiting the site can see what you choose to show.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label htmlFor="phone-visibility" className="block font-bold text-slate-700 mb-1.5">
                  Phone Number Visibility
                </label>
                <select
                  id="phone-visibility"
                  value={phoneVisibility ?? ""}
                  disabled={!phoneVisibility}
                  onChange={(e) => setPhoneVisibility(e.target.value as Visibility)}
                  className={selectClass}
                >
                  {!phoneVisibility && <option value="">Loading…</option>}
                  <option value="public">Shown in the alumni directory</option>
                  <option value="hidden">Hidden (administrators only)</option>
                </select>
              </div>

              <div>
                <label htmlFor="email-visibility" className="block font-bold text-slate-700 mb-1.5">
                  Email Address Visibility
                </label>
                <select
                  id="email-visibility"
                  value={emailVisibility ?? ""}
                  disabled={!emailVisibility}
                  onChange={(e) => setEmailVisibility(e.target.value as Visibility)}
                  className={selectClass}
                >
                  {!emailVisibility && <option value="">Loading…</option>}
                  <option value="public">Shown in the alumni directory</option>
                  <option value="hidden">Hidden (administrators only)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {privacyError ? (
                <span role="alert" className="text-xs font-bold text-rose-700">{privacyError}</span>
              ) : privacySaved ? (
                <span role="status" className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Privacy settings saved.
                </span>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={privacySaving || !phoneVisibility}
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {privacySaving ? "Saving…" : "Save Privacy Settings"}
              </button>
            </div>
          </form>

          {/* Notification Preferences */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Bell className="w-5 h-5 text-emerald-700" />
              <span>Notification Preferences</span>
            </div>
            <p className="text-xs text-slate-500">
              Email and SMS notification preferences are not available yet.
            </p>
          </div>

          {/* Security */}
          <form
            onSubmit={handlePasswordChange}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-emerald-700" />
              <span>Change Password</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="current-password" className="block font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {passwordError ? (
                <span role="alert" className="text-xs font-bold text-rose-700">{passwordError}</span>
              ) : passwordSaved ? (
                <span role="status" className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Password changed. Use it next time you sign in.
                </span>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-6 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {passwordSaving ? "Changing…" : "Change Password"}
              </button>
            </div>
          </form>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
