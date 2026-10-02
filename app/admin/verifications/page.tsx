"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { VerificationRequestItem } from "@/lib/data";
import { decideVerification, fetchVerificationRequests } from "@/lib/admin-verifications";
import { formatTaka } from "@/lib/events/pricing";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  FileText,
  Search,
  Copy,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Camera,
} from "lucide-react";

function VerificationReviewContent() {
  const searchParams = useSearchParams();
  const qId = searchParams.get("id");

  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const selectedId = userSelectedId ?? qId ?? null;
  const setSelectedId = (id: string) => setUserSelectedId(id);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "pending_all" | "awaiting_payment" | "missing_photo" | "verified"
  >("pending_all");

  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);
  const [overriddenApplicantId, setOverriddenApplicantId] = useState<string | null>(null);

  const loadRequests = () => {
    setLoading(true);
    setError(null);
    fetchVerificationRequests("all")
      .then((data) => setRequests(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    fetchVerificationRequests("all")
      .then((data) => {
        if (!active) return;
        setRequests(data);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopyTrx = (trx: string) => {
    navigator.clipboard.writeText(trx);
    setCopiedTrx(trx);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const pendingTotal = requests.filter((r) => r.status === "PENDING").length;
    const awaitingPaymentTotal = requests.filter((r) => r.awaitingPayment).length;
    const pendingRevenue = requests
      .filter((r) => r.awaitingPayment && r.totalFee)
      .reduce((acc, curr) => acc + (curr.totalFee || 0), 0);
    const missingPhotoTotal = requests.filter(
      (r) => !r.hasValidPhoto && r.status === "PENDING"
    ).length;
    const verifiedTotal = requests.filter((r) => r.status === "VERIFIED").length;

    return {
      pendingTotal,
      awaitingPaymentTotal,
      pendingRevenue,
      missingPhotoTotal,
      verifiedTotal,
    };
  }, [requests]);

  // Filtered applicants list
  const filteredList = useMemo(() => {
    return requests.filter((r) => {
      // Tab filter
      if (filterTab === "pending_all" && r.status !== "PENDING") return false;
      if (filterTab === "awaiting_payment" && !r.awaitingPayment) return false;
      if (filterTab === "missing_photo" && r.hasValidPhoto) return false;
      if (filterTab === "verified" && r.status !== "VERIFIED") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.fullName.toLowerCase().includes(q);
        const matchesEmail = r.email.toLowerCase().includes(q);
        const matchesBatch = r.sscBatch.toString().includes(q);
        const matchesRoll = r.rollNumber?.toLowerCase().includes(q);
        const matchesTrx = r.transactionId?.toLowerCase().includes(q);
        const matchesMethod = r.paymentMethod?.toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesEmail &&
          !matchesBatch &&
          !matchesRoll &&
          !matchesTrx &&
          !matchesMethod
        ) {
          return false;
        }
      }
      return true;
    });
  }, [requests, filterTab, searchQuery]);

  const activeApplicant = useMemo(() => {
    if (!selectedId && filteredList.length > 0) return filteredList[0];
    return requests.find((r) => r.id === selectedId) || null;
  }, [requests, selectedId, filteredList]);

  const activeIndex = useMemo(() => {
    if (!activeApplicant) return -1;
    return filteredList.findIndex((r) => r.id === activeApplicant.id);
  }, [filteredList, activeApplicant]);

  const handleNext = () => {
    if (activeIndex >= 0 && activeIndex < filteredList.length - 1) {
      setSelectedId(filteredList[activeIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setSelectedId(filteredList[activeIndex - 1].id);
    }
  };

  const handleDecide = async (id: string, decision: "VERIFIED" | "REJECTED") => {
    setBusyId(id);
    setError(null);
    setSuccessMsg(null);

    try {
      const proof = await decideVerification(id, decision);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: decision,
                awaitingPayment: decision === "VERIFIED" ? false : r.awaitingPayment,
                paymentStatus: decision === "VERIFIED" ? "CONFIRMED" : "CANCELLED",
                proof: proof ?? r.proof,
              }
            : r
        )
      );

      setSuccessMsg(
        decision === "VERIFIED"
          ? "Alumnus approved and payment confirmed successfully!"
          : "Verification request rejected."
      );

      // Automatically move to the next pending applicant if available
      if (activeIndex >= 0 && activeIndex < filteredList.length - 1) {
        setSelectedId(filteredList[activeIndex + 1].id);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  // High-res print photo link
  const printPhotoUrl = activeApplicant?.avatarOriginalUrl
    ? activeApplicant.avatarOriginalUrl
    : activeApplicant?.avatarUrl?.startsWith("/api/media/avatars/")
    ? activeApplicant.avatarUrl.replace("avatar.webp", "original.jpg")
    : null;

  const adminPhotoOverride = Boolean(activeApplicant && overriddenApplicantId === activeApplicant.id);
  const setAdminPhotoOverride = (allow: boolean) => {
    setOverriddenApplicantId(allow && activeApplicant ? activeApplicant.id : null);
  };

  const isPhotoMandatorySatisfied = Boolean(
    activeApplicant?.hasValidPhoto || adminPhotoOverride
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Payment &amp; Document Verification Console
              </h1>
              <p className="text-xs text-slate-500">
                Inspect applicant credentials, verify bKash/Nagad payments, and validate mandatory profile photos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadRequests}
            disabled={loading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/alumni"
            className="px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Table View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Awaiting Payment
            </div>
            <div className="text-xl font-black text-slate-900">
              {metrics.awaitingPaymentTotal}
              <span className="text-xs font-semibold text-amber-700 ml-1.5">
                ({formatTaka(metrics.pendingRevenue)})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Missing Profile Pic
            </div>
            <div className="text-xl font-black text-rose-700">
              {metrics.missingPhotoTotal}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                (Mandatory Check)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Pending Queue
            </div>
            <div className="text-xl font-black text-slate-900">
              {metrics.pendingTotal}
              <span className="text-xs font-normal text-slate-400 ml-1.5">applicants</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Verified Alumni
            </div>
            <div className="text-xl font-black text-emerald-800">
              {metrics.verifiedTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Notices */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div
          role="alert"
          className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Applicant Queue List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[750px] overflow-hidden">
          {/* Search & Tabs */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, batch, email, or TrxID..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilterTab("pending_all")}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  filterTab === "pending_all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Pending ({metrics.pendingTotal})
              </button>
              <button
                onClick={() => setFilterTab("awaiting_payment")}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterTab === "awaiting_payment"
                    ? "bg-amber-600 text-white"
                    : "text-amber-800 hover:bg-amber-100 bg-amber-50"
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Payment ({metrics.awaitingPaymentTotal})</span>
              </button>
              <button
                onClick={() => setFilterTab("missing_photo")}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  filterTab === "missing_photo"
                    ? "bg-rose-700 text-white"
                    : "text-rose-800 hover:bg-rose-100 bg-rose-50"
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>Missing Pic ({metrics.missingPhotoTotal})</span>
              </button>
              <button
                onClick={() => setFilterTab("verified")}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  filterTab === "verified"
                    ? "bg-emerald-800 text-white"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                Verified
              </button>
            </div>
          </div>

          {/* Applicant Queue Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {loading && (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Loading verification requests...
              </div>
            )}
            {!loading && filteredList.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No applicants match the current filter.
              </div>
            )}
            {!loading &&
              filteredList.map((r) => {
                const isSelected = activeApplicant?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950 text-white shadow-md border border-emerald-800"
                        : "hover:bg-slate-50 text-slate-800 border border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={r.avatarUrl || "/logo.png"}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-white/20 bg-slate-200 shrink-0"
                      />
                      {!r.hasValidPhoto && (
                        <span
                          title="Mandatory profile photo missing!"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border border-white"
                        >
                          !
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs truncate">
                          {r.fullName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? "bg-emerald-800 text-amber-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          SSC {r.sscBatch}
                        </span>
                      </div>

                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {r.email}
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {/* Payment Pill */}
                        {r.awaitingPayment ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            <CreditCard className="w-2.5 h-2.5" />
                            <span>
                              {r.paymentMethod || "Payment"} {r.totalFee ? `৳${r.totalFee}` : ""}
                            </span>
                          </span>
                        ) : r.paymentStatus === "CONFIRMED" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            Paid
                          </span>
                        ) : null}

                        {/* Doc Pill */}
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isSelected
                              ? "bg-white/10 text-slate-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[90px]">
                            {r.documentType}
                          </span>
                        </span>

                        {/* Missing photo pill */}
                        {!r.hasValidPhoto && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            No Photo
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN: Full Inspection & Action Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeApplicant ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Applicant Header Bar */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={activeApplicant.avatarUrl || "/logo.png"}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 bg-slate-800 shrink-0"
                    />
                    {!activeApplicant.hasValidPhoto && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                        No Photo
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">
                        {activeApplicant.fullName}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-amber-300 text-xs font-bold">
                        SSC {activeApplicant.sscBatch}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{activeApplicant.email}</span>
                      {activeApplicant.phone && <span>• {activeApplicant.phone}</span>}
                      {activeApplicant.rollNumber && (
                        <span>• Roll: {activeApplicant.rollNumber}</span>
                      )}
                      {activeApplicant.profession && (
                        <span>• {activeApplicant.profession}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Queue Navigator */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-xs text-slate-400 font-semibold mr-1">
                    {activeIndex + 1} of {filteredList.length}
                  </span>
                  <button
                    onClick={handlePrev}
                    disabled={activeIndex <= 0}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                    title="Previous Applicant"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={activeIndex >= filteredList.length - 1}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
                    title="Next Applicant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Detail Inspection Body */}
              <div className="p-6 space-y-6">
                {/* 1. MANDATORY PROFILE PHOTO CHECK */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    activeApplicant.hasValidPhoto
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-rose-50/70 border-rose-300 ring-2 ring-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
                    <div className="flex items-center gap-2">
                      <Camera
                        className={`w-5 h-5 ${
                          activeApplicant.hasValidPhoto
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        1. Profile Photograph Verification (Mandatory)
                      </h3>
                    </div>
                    {activeApplicant.hasValidPhoto ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Valid Photo Uploaded</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                        <span>Profile Picture Missing (Action Required)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative group shrink-0">
                      <img
                        src={activeApplicant.avatarUrl || "/logo.png"}
                        alt="Profile photo preview"
                        className="w-28 h-28 rounded-2xl object-cover border-2 border-slate-200 shadow-sm bg-white"
                      />
                      {printPhotoUrl && (
                        <a
                          href={printPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] font-bold p-1 text-center"
                        >
                          <ExternalLink className="w-4 h-4 mb-1" />
                          <span>View Full Res</span>
                        </a>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      {activeApplicant.hasValidPhoto ? (
                        <>
                          <div className="font-bold text-emerald-900">
                            Portrait image is ready for Diamond Jubilee Directory &amp; PVC ID Card.
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Web avatar (400×400 px) stored with EXIF orientation corrected.
                            {printPhotoUrl ? (
                              <span className="block mt-1">
                                <a
                                  href={printPhotoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-700 hover:text-emerald-900 font-bold underline inline-flex items-center gap-1"
                                >
                                  <span>Inspect Original Print Master Photo</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </span>
                            ) : null}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="font-black text-rose-900">
                            ⚠️ Mandatory requirement not met: Alumnus has not uploaded an authentic profile photo.
                          </div>
                          <p className="text-rose-800 text-[11px] leading-relaxed">
                            Official policy requires an authentic face photograph before alumni verification can be awarded. The applicant was registered with a placeholder image.
                          </p>
                          <div className="pt-2">
                            <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                              <input
                                type="checkbox"
                                checked={adminPhotoOverride}
                                onChange={(e) => setAdminPhotoOverride(e.target.checked)}
                                className="rounded text-emerald-700 focus:ring-emerald-600"
                              />
                              <span>Admin Exception: Approve without photo (e.g. offline verification)</span>
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. STUDY PROOF DOCUMENT VERIFICATION */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-800" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        2. Proof of Study Document Verification
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                      {activeApplicant.documentType}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeApplicant.proof ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">Uploaded Document:</span>{" "}
                            <span className="text-slate-600">{activeApplicant.documentType}</span>
                            {activeApplicant.proof.note && (
                              <span className="text-slate-500 italic">
                                {" "}
                                — “{activeApplicant.proof.note}”
                              </span>
                            )}
                          </div>
                          {activeApplicant.proof.fileUrl && (
                            <a
                              href={activeApplicant.proof.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Original Document</span>
                            </a>
                          )}
                        </div>

                        {/* Document Preview Box */}
                        {activeApplicant.proof.fileUrl ? (
                          <div className="mt-3 p-2 bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-[380px] flex items-center justify-center">
                            {activeApplicant.proof.fileUrl.endsWith(".pdf") ? (
                              <iframe
                                src={activeApplicant.proof.fileUrl}
                                className="w-full h-[360px] rounded-xl border border-slate-100"
                                title="Study proof PDF"
                              />
                            ) : (
                              <a
                                href={activeApplicant.proof.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block max-h-[360px] overflow-hidden rounded-xl cursor-zoom-in"
                              >
                                <img
                                  src={activeApplicant.proof.fileUrl}
                                  alt="Study proof document"
                                  className="max-h-[360px] w-auto object-contain mx-auto rounded-xl hover:scale-[1.02] transition-transform"
                                />
                              </a>
                            )}
                          </div>
                        ) : activeApplicant.proof.deletedAt ? (
                          <div className="p-4 rounded-xl bg-slate-100 text-slate-600 text-xs italic">
                            Proof file deleted after decision by{" "}
                            {activeApplicant.proof.reviewedBy ?? "Administrator"} on{" "}
                            {new Date(activeApplicant.proof.deletedAt).toLocaleDateString("en-GB")}.
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-xs italic">
                            No proof file on record.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-100 text-slate-500 text-xs italic">
                        No proof of study document uploaded.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. PAYMENT VERIFICATION */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-700" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        3. Payment &amp; Registration Verification
                      </h3>
                    </div>
                    {activeApplicant.awaitingPayment ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Awaiting Confirmation</span>
                      </span>
                    ) : activeApplicant.paymentStatus === "CONFIRMED" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Payment Confirmed</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                        No Payment Required
                      </span>
                    )}
                  </div>

                  {activeApplicant.transactionId ||
                  activeApplicant.paymentMethod ||
                  activeApplicant.totalFee ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Provider */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Payment Provider
                        </div>
                        <div className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-xs uppercase tracking-wide ${
                              activeApplicant.paymentMethod?.toLowerCase().includes("bkash")
                                ? "bg-pink-100 text-pink-700 border border-pink-200"
                                : activeApplicant.paymentMethod?.toLowerCase().includes("nagad")
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : activeApplicant.paymentMethod?.toLowerCase().includes("rocket")
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {activeApplicant.paymentMethod || "Payment"}
                          </span>
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Total Fee Paid
                        </div>
                        <div className="text-sm font-black text-emerald-800 mt-1">
                          {activeApplicant.totalFee !== null && activeApplicant.totalFee !== undefined
                            ? `৳${activeApplicant.totalFee.toLocaleString("en-BD")}`
                            : "—"}
                        </div>
                      </div>

                      {/* TrxID with Copy */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Transaction ID (TrxID)
                        </div>
                        <div className="flex items-center justify-between gap-1 mt-1 font-mono font-bold text-xs text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          <span className="select-all">{activeApplicant.transactionId || "—"}</span>
                          {activeApplicant.transactionId && (
                            <button
                              type="button"
                              onClick={() => handleCopyTrx(activeApplicant.transactionId!)}
                              className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Copy Transaction ID"
                            >
                              {copiedTrx === activeApplicant.transactionId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-white rounded-xl border border-slate-200">
                      Standard membership registration without separate transaction fee.
                    </div>
                  )}

                  {activeApplicant.membershipEventId && (
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Linked to Jubilee Membership Event Roster
                      </span>
                      <Link
                        href={`/admin/events/${activeApplicant.membershipEventId}?tab=attendees`}
                        className="text-amber-800 hover:text-amber-950 font-bold underline inline-flex items-center gap-1"
                      >
                        <span>Open Jubilee Attendee List</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* 4. VERIFICATION ACTION CONTROLS */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    {!isPhotoMandatorySatisfied ? (
                      <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Approval locked: Genuine profile picture is mandatory.</span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>All verification checks passed. Ready for approval.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleDecide(activeApplicant.id, "REJECTED")}
                      disabled={busyId !== null || activeApplicant.status === "REJECTED"}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Reject Application
                    </button>

                    <button
                      onClick={() => handleDecide(activeApplicant.id, "VERIFIED")}
                      disabled={
                        busyId !== null ||
                        activeApplicant.status === "VERIFIED" ||
                        !isPhotoMandatorySatisfied
                      }
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title={
                        !isPhotoMandatorySatisfied
                          ? "Profile picture is mandatory"
                          : "Approve Alumnus and Confirm Payment"
                      }
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>
                        {activeApplicant.awaitingPayment
                          ? "Approve & Confirm Payment"
                          : "Verify & Approve Alumnus"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              Select an applicant from the queue to start verification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminVerificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-slate-500 font-medium">
          Loading verification workspace...
        </div>
      }
    >
      <VerificationReviewContent />
    </Suspense>
  );
}
