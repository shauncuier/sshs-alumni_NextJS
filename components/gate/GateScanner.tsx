"use client";

import React, { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  UserCheck,
  Users,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface ScanLog {
  id: string;
  name: string;
  batch: number | null;
  alumniId: string;
  status: "AUTHORIZED" | "DENIED";
  time: string;
  gate: string;
}

// Rendered by app/gate/page.tsx, which checks the gate-staff role on the server.
export default function GateScanner() {
  const [qrInput, setQrInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [latestResult, setLatestResult] = useState<any | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([
    {
      id: "scan-1",
      name: "Dr. Nusrat Jahan",
      batch: 2005,
      alumniId: "SSGHS-ALM-2005-B9F4C",
      status: "AUTHORIZED",
      time: "10:14 AM",
      gate: "Main Gate 1",
    },
    {
      id: "scan-2",
      name: "Tanvir Ahmed",
      batch: 2012,
      alumniId: "SSGHS-ALM-2012-7A12E",
      status: "AUTHORIZED",
      time: "10:18 AM",
      gate: "Main Gate 1",
    },
    {
      id: "scan-3",
      name: "Farhana Chowdhury",
      batch: 2018,
      alumniId: "SSGHS-ALM-2018-9128D",
      status: "AUTHORIZED",
      time: "10:22 AM",
      gate: "Main Gate 2",
    },
  ]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qrInput.trim()) return;

    setIsVerifying(true);
    setLatestResult(null);

    // Extract token if user pasted full URL
    let token = qrInput.trim();

    if (token.startsWith("SSGHS-TICKET:")) {
      try {
        const res = await fetch("/api/events/verify-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: token }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setLatestResult({
            valid: true,
            alumnus: {
              fullName: data.attendee.name,
              sscBatch: data.attendee.batch,
              alumniId: `${data.eventTitle} · ${data.packageName ?? "No package"} · ${data.headCount} ${data.headCount === 1 ? "person" : "people"}`,
              membershipTier: "EVENT TICKET",
              bloodGroup: null,
            },
          });
          setScanHistory((prev) => [
            {
              id: `scan-${Date.now()}`,
              name: data.attendee.name,
              batch: data.attendee.batch,
              alumniId: data.eventTitle,
              status: "AUTHORIZED",
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              gate: "Event Ticket",
            },
            ...prev,
          ]);
        } else {
          setLatestResult({
            valid: false,
            error: data.message || data.error || `Ticket check failed (HTTP ${res.status})`,
          });
        }
      } catch (err) {
        setLatestResult({
          valid: false,
          error: "Verification request failed: " + (err as Error).message,
        });
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (token.includes("/verify/")) {
      token = token.split("/verify/")[1].split("?")[0];
    }

    try {
      const res = await fetch("/api/alumni/card/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, gateId: "GATE_MAIN_CAM" }),
      });

      const data = await res.json();
      setLatestResult(data);

      if (data.valid && data.alumnus) {
        const newLog: ScanLog = {
          id: `scan-${Date.now()}`,
          name: data.alumnus.fullName,
          batch: data.alumnus.sscBatch,
          alumniId: data.alumnus.alumniId,
          status: "AUTHORIZED",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          gate: "Main Gate 1",
        };
        setScanHistory([newLog, ...scanHistory]);
      }
    } catch (err: any) {
      setLatestResult({
        valid: false,
        error: "Verification request failed: " + err.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateScan = async () => {
    // Fetch current user card to test verification
    try {
      const cardRes = await fetch("/api/alumni/card");
      if (cardRes.ok) {
        const cardData = await cardRes.json();
        setQrInput(cardData.signedToken);
        // Automatically verify
        setTimeout(() => {
          const btn = document.getElementById("verify-btn");
          btn?.click();
        }, 100);
      }
    } catch {
      setQrInput("sample-invalid-token");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 h-screen overflow-y-auto">
        <AppHeader title="Gate Scanner & Reunion Check-In" />

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>EIIN 105070 Gate Protocol</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Gate Entry &amp; Attendance Verification
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Scan delegate QR codes or enter Alumni Pass ID to authenticate entrance during reunions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSimulateScan}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Test Scan Live Card</span>
              </button>
            </div>
          </div>

          {/* Scanner & Verification Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Camera / QR Input */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Optical QR Scanner / Token Input</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Gate #1 Active</span>
                </div>

                {/* Simulated Camera Viewfinder */}
                <div className="relative aspect-video rounded-2xl bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-2 border-emerald-500/40">
                  <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-dashed border-emerald-400/80 rounded-xl animate-pulse flex items-center justify-center text-emerald-400 text-xs font-mono">
                      <span>SCAN TARGET</span>
                    </div>
                  </div>

                  <p className="relative z-10 text-xs text-slate-300 bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-xs">
                    Point camera at alumnus digital card or paste payload below
                  </p>
                </div>

                {/* Manual Input / Barcode reader input */}
                <form onSubmit={handleVerify} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scanned QR Code Token or Verification URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste or scan QR string here..."
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        id="verify-btn"
                        type="submit"
                        disabled={isVerifying || !qrInput.trim()}
                        className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                      >
                        {isVerifying ? "Verifying..." : "Verify Gate Pass"}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Real-Time Result Alert */}
                {latestResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      latestResult.valid
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {latestResult.valid ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>AUTHORIZED ENTRY — {latestResult.alumnus?.fullName}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>ENTRY DENIED: {latestResult.error}</span>
                        </>
                      )}
                    </div>

                    {latestResult.valid && latestResult.alumnus && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                        <div>
                          <span className="text-emerald-700">Batch:</span>{" "}
                          <strong className="text-emerald-950">
                            {latestResult.alumnus.sscBatch ? `Batch ${latestResult.alumnus.sscBatch}` : "N/A"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-emerald-700">Tier:</span>{" "}
                          <strong className="text-emerald-950">
                            {latestResult.alumnus.membershipTier}
                          </strong>
                        </div>
                        <div>
                          <span className="text-emerald-700">Pass ID:</span>{" "}
                          <span className="font-mono text-emerald-950">
                            {latestResult.alumnus.alumniId}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700">Blood:</span>{" "}
                          <strong className="text-emerald-950">
                            {latestResult.alumnus.bloodGroup || "N/A"}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 cols: Live Gate Scan Ledger */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>Recent Gate Check-Ins</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {scanHistory.length} Verified
                  </span>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {scanHistory.map((scan) => (
                    <div key={scan.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">
                          {scan.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {scan.batch ? `SSC '${String(scan.batch).slice(-2)} • ` : ""}{scan.alumniId}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                          {scan.status}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {scan.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
