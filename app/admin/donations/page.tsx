"use client";

import React, { useEffect, useState } from "react";
import { Heart, Plus, TrendingUp, Users, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react";

interface DonationCampaignItem {
  id: string;
  title: string;
  category: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  bannerImage: string;
  isActive: boolean;
  daysLeft: number;
  createdAt: string;
}

interface DonationRecord {
  id: string;
  donorName: string;
  donorEmail: string | null;
  donorBatch: number | null;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  campaignTitle: string;
  paidAt: string | null;
  createdAt: string;
  transactionRef: string | null;
}

interface PendingDonation {
  id: string;
  donorName: string;
  isAnonymous: boolean;
  donorEmail: string | null;
  donorPhone: string | null;
  donorBatch: number | null;
  amount: number;
  paymentMethod: string;
  transactionRef: string | null;
  receiptId: string | null;
  campaignTitle: string;
  createdAt: string;
}

interface AdminDonationsStats {
  totalRaised: number;
  totalGoal: number;
  totalDonors: number;
  activeCampaignsCount: number;
}

export default function AdminDonationsPage() {
  const [stats, setStats] = useState<AdminDonationsStats>({
    totalRaised: 0,
    totalGoal: 0,
    totalDonors: 0,
    activeCampaignsCount: 0,
  });
  const [campaigns, setCampaigns] = useState<DonationCampaignItem[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [pending, setPending] = useState<PendingDonation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/donations", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch donations report (${res.status})`);
      }
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
      if (Array.isArray(data.donations)) setDonations(data.donations);
      if (Array.isArray(data.pending)) setPending(data.pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const decide = async (d: PendingDonation, action: "VERIFY" | "REJECT") => {
    let reason: string | null = null;
    if (action === "REJECT") {
      reason = window.prompt(`Why is the ${d.paymentMethod} payment ${d.transactionRef ?? ""} of ৳${d.amount.toLocaleString()} rejected?`);
      if (!reason || !reason.trim()) return;
    } else if (!window.confirm(`Verify ৳${d.amount.toLocaleString()} from ${d.donorName}? Check that ${d.paymentMethod} transaction ${d.transactionRef ?? ""} arrived first.`)) {
      return;
    }
    setBusyId(d.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/donations/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save the decision.");
      setNotice(action === "VERIFY" ? `Verified ৳${d.amount.toLocaleString()} from ${d.donorName}.` : `Rejected the donation from ${d.donorName}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Donation Campaigns &amp; Transparency Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time funds raised for scholarships, STEM laboratories, and school infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div role="status" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">{notice}</div>
      )}

      {/* Manual donations waiting for the committee */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-xs">
        <div className="p-4 sm:p-5 border-b border-amber-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" /> Waiting for verification
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Check each transaction ID in the bKash / Nagad / bank statement before verifying. Only verified donations count towards a campaign.</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200 shrink-0">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-xs">Nothing to verify.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((d) => (
              <div key={d.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-0.5 text-xs">
                  <div className="font-black text-emerald-800 text-sm">
                    ৳{d.amount.toLocaleString()} <span className="font-semibold text-slate-500 text-xs">by {d.paymentMethod}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 break-all">{d.transactionRef ?? "—"}</div>
                  <div className="text-slate-700">
                    {d.donorName}
                    {d.isAnonymous ? " (wants to stay anonymous)" : ""}
                    {d.donorBatch ? ` · SSC ${d.donorBatch}` : ""}
                  </div>
                  <div className="text-slate-500 break-all">
                    {[d.donorPhone, d.donorEmail].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    {d.campaignTitle} · {d.receiptId} · {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:flex gap-2 lg:shrink-0">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(d, "VERIFY")}
                    className="px-4 py-2.5 min-h-[44px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(d, "REJECT")}
                    className="px-4 py-2.5 min-h-[44px] border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aggregate metrics - 100% Dynamic from Backend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Total Funds Collected
          </span>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            {loading ? "..." : `৳${stats.totalRaised.toLocaleString()}`}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {stats.activeCampaignsCount} active campaign{stats.activeCampaignsCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500" /> Active Campaign Goal
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {loading ? "..." : `৳${stats.totalGoal.toLocaleString()}`}
          </div>
          <span className="text-[10px] text-slate-400">Target across all drives</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-600" /> Total Donors
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {loading ? "..." : `${stats.totalDonors.toLocaleString()} Alumni`}
          </div>
          <span className="text-[10px] text-slate-400">Verified contributions</span>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Active Campaign Progress</h2>
        {campaigns.length === 0 && !loading && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">No active donation campaigns registered in database yet.</p>
            <p className="text-xs text-slate-400">Campaigns created will automatically appear here with live metrics.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const pct = c.goalAmount > 0 ? Math.min((c.raisedAmount / c.goalAmount) * 100, 100) : 0;
            return (
              <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {c.category}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1">{c.title}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {c.daysLeft} days left
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-700">Raised: ৳{c.raisedAmount.toLocaleString()}</span>
                    <span className="text-slate-500">Goal: ৳{c.goalAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{pct.toFixed(1)}% funded</span>
                    <span>{c.donorCount} donors</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Transparency Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Recent Contributions Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live donor transactions logged from verified payment gateways.</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200">
            {donations.length} Transactions
          </span>
        </div>

        {donations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            No donation transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-6">Donor</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{d.donorName}</td>
                    <td className="py-3.5 px-4 text-emerald-800 font-medium">
                      {d.donorBatch ? `SSC '${String(d.donorBatch).slice(-2)}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{d.campaignTitle}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-800">৳{d.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{d.paymentMethod}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.transactionRef ?? "—"}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          d.paymentStatus === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : d.paymentStatus === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400 text-[11px]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
