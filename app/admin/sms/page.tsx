"use client";

import { useEscapeKey } from "@/components/shared/useEscapeKey";
import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Upload,
  Smartphone,
  ShieldCheck,
  Info,
  Clock,
  Check,
  Layers,
  HeartHandshake,
  UserCheck,
  FileText,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap,
  TrendingDown,
} from "lucide-react";
import { calculateSmsMetrics, normalizeBdPhoneNumber, isValidBdMobile } from "@/lib/bulksmsbd";
import type { SmsContactItem } from "@/app/api/admin/sms/contacts/route";
import type { SmsBroadcastRecord } from "@/lib/sms-history";
import SmsTestModeSwitch from "@/components/admin/SmsTestModeSwitch";

export interface SmsTemplateItem {
  id: string;
  lang: "en" | "banglish" | "bn";
  title: string;
  category: string;
  text: string;
  isCostSaver: boolean;
  tag: string;
}

// This site's address for links in messages (production: the real domain).
const SITE = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

const PRESET_TEMPLATE_TEXTS: Omit<SmsTemplateItem, "tag">[] = [
  // ── ENGLISH (COST SAVER: Strictly <= 160 characters = 1 SMS Credit) ──
  {
    id: "en-reunion",
    lang: "en",
    title: "Event registration open",
    category: "Reunion",
    text: `Praktan Sabujian Parishad: Dear Alumnus, event registration is now open! Get your Digital ID pass & register at ${SITE}/events - Praktan Sabujian Parishad`,
    isCostSaver: true,
  },
  {
    id: "en-idcard",
    lang: "en",
    title: "Digital Smart ID Card Pass Ready",
    category: "ID Card",
    text: `Dear Alumnus, your Digital Smart ID Card is ready. Login to download your gate pass: ${SITE}/card - Praktan Sabujian Parishad`,
    isCostSaver: true,
  },
  {
    id: "en-verify",
    lang: "en",
    title: "Alumni Profile Verified Welcome",
    category: "Verification",
    text: `Congratulations! Your Praktan Sabujian Parishad profile has been verified. Connect with teachers & batchmates at ${SITE} - Praktan Sabujian Parishad`,
    isCostSaver: true,
  },
  {
    id: "en-batchreps",
    lang: "en",
    title: "Batch Reps Coordination Call",
    category: "Batch Reps",
    text: "Notice: Batch representatives meeting on [DAY] at [TIME], [PLACE]. Please join on time. - SSGHS Committee",
    isCostSaver: true,
  },
  {
    id: "en-volunteers",
    lang: "en",
    title: "Volunteers Gate Briefing",
    category: "Volunteers",
    text: "Volunteers: event briefing on [DAY] at [TIME], [PLACE]. Please attend on time. - SSGHS",
    isCostSaver: true,
  },
  {
    id: "en-notice",
    lang: "en",
    title: "Urgent Campus Notice",
    category: "Notice",
    text: `Notice: Praktan Sabujian Parishad General Meeting announcement has been published. Read details at ${SITE} - Executive Committee`,
    isCostSaver: true,
  },

  // ── BANGLISH (COST SAVER: Bengali written in English GSM-7 = 1 SMS Credit) ──
  {
    id: "bg-reunion",
    lang: "banglish",
    title: "Reunion Registration (Banglish)",
    category: "Reunion",
    text: `SSGHS Punormiloni 2026! Priyo Praktan Shikkharthi, registration shuru hoyeche. Digital ID pass pete visit korun: ${SITE}/events`,
    isCostSaver: true,
  },
  {
    id: "bg-idcard",
    lang: "banglish",
    title: "Digital ID Card Ready (Banglish)",
    category: "ID Card",
    text: `Apnar Digital Smart ID Card prostut hoyeche. Digital gate pass download korte login korun: ${SITE}/card - Praktan Sabujian Parishad`,
    isCostSaver: true,
  },
  {
    id: "bg-verify",
    lang: "banglish",
    title: "Profile Verified (Banglish)",
    category: "Verification",
    text: `Abhinandan! Praktan Sabujian Parishad-e apnar profile verified hoyeche. Shokol shikkhok o bondhuder shathe jukto thakun: ${SITE}`,
    isCostSaver: true,
  },
  {
    id: "bg-batchreps",
    lang: "banglish",
    title: "Batch Reps Shobha (Banglish)",
    category: "Batch Reps",
    text: "Joruri Notice: [DIN] [SHOMOY]-e [JAYGA]-y Batch Protinidhider shobha hobe. Shokolke thakar onurodh roilo. - SSGHS",
    isCostSaver: true,
  },

  // ── BANGLA UNICODE (70 chars per SMS segment - Uses 2x to 3x more credits) ──
  {
    id: "bn-reunion",
    lang: "bn",
    title: "পুনর্মিলনী রেজিস্ট্রেশন (বাংলা)",
    category: "Reunion",
    text: `শুভ পুনর্মিলনী ২০২৬! প্রিয় প্রাক্তন শিক্ষার্থী, সবুজের আঙিনায় ঐতিহাসিক পুনর্মিলনীর রেজিস্ট্রেশন শুরু হয়েছে। বিস্তারিত: ${SITE}/events`,
    isCostSaver: false,
  },
  {
    id: "bn-idcard",
    lang: "bn",
    title: "ডিজিটাল আইডি প্রস্তুত (বাংলা)",
    category: "ID Card",
    text: `সম্মানিত অ্যালামনাই, আপনার ডিজিটাল স্মার্ট আইডি প্রস্তুত হয়েছে। গেট পাস দেখতে লগইন করুন: ${SITE}/card`,
    isCostSaver: false,
  },
  {
    id: "bn-verify",
    lang: "bn",
    title: "প্রোফাইল ভেরিফাইড (বাংলা)",
    category: "Verification",
    text: `অভিনন্দন! আপনার অ্যালামনাই প্রোফাইল ভেরিফাইড হয়েছে। সহপাঠীদের সাথে যুক্ত হতে ভিজিট করুন: ${SITE}`,
    isCostSaver: false,
  },
];

const PRESET_TEMPLATES: SmsTemplateItem[] = PRESET_TEMPLATE_TEXTS.map((t) => {
  const m = calculateSmsMetrics(t.text);
  return { ...t, isCostSaver: m.partsCount === 1, tag: `${m.partsCount} SMS • ${m.charCount} chars` };
});

export default function AdminBulkSmsPage() {
  // Gateway & Balance State
  const [balance, setBalance] = useState<string>("...");
  const [, setIsSimulated] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [senderId, setSenderId] = useState<string>("SSGHS");
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true);

  // Contacts State
  const [contacts, setContacts] = useState<SmsContactItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<number[]>([]);
  const [contactsLoading, setContactsLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<"ALL" | "VERIFIED" | "BATCH_REPS" | "VOLUNTEERS" | "BATCH" | "MANUAL">("ALL");
  const [selectedBatch, setSelectedBatch] = useState<number | "">("");

  // Manual Input & CSV State
  const [manualText, setManualText] = useState<string>("");

  // Composer State
  const [templateLang, setTemplateLang] = useState<"en" | "banglish" | "bn">("en");
  const [message, setMessage] = useState<string>("");
  const [customSenderId, setCustomSenderId] = useState<string>("");

  // Single Test SMS State
  const [testPhone, setTestPhone] = useState<string>("");
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Broadcast Dispatch State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  useEscapeKey(showConfirmModal, () => setShowConfirmModal(false));
  const [isSending, setIsSending] = useState<boolean>(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    success: boolean;
    text: string;
    sentCount?: number;
    creditsUsed?: number;
    messageId?: string | number;
  } | null>(null);

  // History State
  const [history, setHistory] = useState<SmsBroadcastRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // ── Fetch Gateway Balance ──────────────────────────────────────────
  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/admin/sms/balance");
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance || "0");
        setIsSimulated(Boolean(data.isSimulated));
        setIsConfigured(Boolean(data.isConfigured));
        if (data.senderId) {
          setSenderId(data.senderId);
        }
      }
    } catch (e) {
      console.error("Balance fetch error:", e);
    } finally {
      setBalanceLoading(false);
    }
  };

  // ── Fetch Contacts ────────────────────────────────────────────────
  const fetchContacts = async () => {
    setContactsLoading(true);
    try {
      const res = await fetch("/api/admin/sms/contacts");
      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
        setAvailableBatches(data.batches || []);
      }
    } catch (e) {
      console.error("Contacts fetch error:", e);
    } finally {
      setContactsLoading(false);
    }
  };

  // ── Fetch Broadcast History ────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/sms/send");
      const data = await res.json();
      if (res.ok && data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error("History fetch error:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance(); // eslint-disable-line react-hooks/set-state-in-effect
    fetchContacts();
    fetchHistory();
  }, []);

  // ── Parse Manual Numbers Input ─────────────────────────────────────
  // Numbers typed or pasted by hand, split into valid (deduplicated) and invalid.
  const { manualParsedNumbers, manualInvalidNumbers } = useMemo(() => {
    if (!manualText.trim()) return { manualParsedNumbers: [] as string[], manualInvalidNumbers: [] as string[] };

    const tokens = manualText
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const token of tokens) {
      const normalized = normalizeBdPhoneNumber(token);
      if (normalized && isValidBdMobile(normalized)) {
        if (!seen.has(normalized)) {
          seen.add(normalized);
          valid.push(normalized);
        }
      } else {
        invalid.push(token);
      }
    }

    return { manualParsedNumbers: valid, manualInvalidNumbers: invalid };
  }, [manualText]);

  // ── Handle CSV File Upload ────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setManualText((prev) => (prev ? `${prev}\n${content}` : content));
        setGroupFilter("MANUAL");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  // ── Filtered Contacts ──────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Group filter
      if (groupFilter === "VERIFIED" && c.status !== "VERIFIED") return false;
      if (groupFilter === "BATCH_REPS" && c.category !== "BATCH_REP") return false;
      if (groupFilter === "VOLUNTEERS" && c.category !== "VOLUNTEER") return false;
      if (groupFilter === "BATCH" && selectedBatch !== "" && c.batch !== Number(selectedBatch)) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q) || c.normalizedPhone.includes(q);
        const matchesBatch = c.batch ? c.batch.toString().includes(q) : false;
        const matchesDetail = c.detail ? c.detail.toLowerCase().includes(q) : false;
        return matchesName || matchesPhone || matchesBatch || matchesDetail;
      }

      return true;
    });
  }, [contacts, groupFilter, selectedBatch, searchQuery]);

  // ── Selected Recipients Calculation ────────────────────────────────
  const activeRecipientNumbers = useMemo(() => {
    if (groupFilter === "MANUAL") {
      return manualParsedNumbers;
    }
    const numbers: string[] = [];
    for (const c of filteredContacts) {
      if (selectedIds.has(c.id)) {
        numbers.push(c.normalizedPhone);
      }
    }
    return numbers;
  }, [groupFilter, manualParsedNumbers, filteredContacts, selectedIds]);

  // ── SMS Metrics Calculation ────────────────────────────────────────
  const metrics = useMemo(() => {
    return calculateSmsMetrics(message);
  }, [message]);

  const totalCreditsNeeded = activeRecipientNumbers.length * metrics.partsCount;

  // ── Checkbox Toggling ──────────────────────────────────────────────
  const toggleSelectAll = () => {
    const allFilteredIds = filteredContacts.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Send Test SMS ──────────────────────────────────────────────────
  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestFeedback({ text: "Please enter a test mobile number.", isError: true });
      return;
    }
    const normalized = normalizeBdPhoneNumber(testPhone);
    if (!normalized || !isValidBdMobile(normalized)) {
      setTestFeedback({
        text: "Please enter a valid Bangladeshi mobile number (e.g. 01711234567).",
        isError: true,
      });
      return;
    }

    setTestSending(true);
    setTestFeedback(null);
    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [normalized],
          message: message.trim(),
          senderId: customSenderId.trim() || senderId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestFeedback({
          text: `Test SMS dispatched successfully to ${normalized}! ${
            data.isSimulated ? "(Sandbox Mode)" : ""
          }`,
          isError: false,
        });
        fetchBalance();
        fetchHistory();
      } else {
        setTestFeedback({
          text: data.error || "Failed to send test SMS",
          isError: true,
        });
      }
    } catch (e) {
      setTestFeedback({
        text: e instanceof Error ? e.message : "Network error during test SMS dispatch",
        isError: true,
      });
    } finally {
      setTestSending(false);
    }
  };

  // ── Send Bulk Broadcast ────────────────────────────────────────────
  const handleConfirmBroadcast = async () => {
    if (activeRecipientNumbers.length === 0) {
      setBroadcastFeedback({ success: false, text: "Choose at least one recipient." });
      setShowConfirmModal(false);
      return;
    }
    if (!message.trim()) {
      setBroadcastFeedback({ success: false, text: "Write the message first." });
      setShowConfirmModal(false);
      return;
    }

    setIsSending(true);
    setBroadcastFeedback(null);
    setShowConfirmModal(false);

    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: activeRecipientNumbers,
          message: message.trim(),
          senderId: customSenderId.trim() || senderId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBroadcastFeedback({
          success: true,
          text: `Broadcast successfully dispatched to ${data.sentCount} recipients!`,
          sentCount: data.sentCount,
          creditsUsed: data.totalCreditsUsed,
          messageId: data.messageId,
        });
        fetchBalance();
        fetchHistory();
      } else {
        setBroadcastFeedback({
          success: false,
          text: data.error || "Bulk SMS dispatch failed.",
        });
      }
    } catch (e) {
      setBroadcastFeedback({
        success: false,
        text: e instanceof Error ? e.message : "Network error during bulk dispatch.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              BulkSMSBD Gateway
            </span>
            {isConfigured ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live Gateway
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <Info className="w-3 h-3 text-amber-700" /> Simulation Sandbox
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-emerald-700" /> Bulk SMS Broadcast
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Send instant SMS alerts, reunion invitations, and notices to alumni contact lists via Bangladesh BulkSMSBD.
          </p>
        </div>

        {/* Live Balance & Gateway Status Card */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              SMS Balance
              <button
                type="button"
                onClick={fetchBalance}
                disabled={balanceLoading}
                className="text-slate-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={`w-3 h-3 ${balanceLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="text-lg font-black text-slate-900 leading-tight">
              {balanceLoading ? "..." : balance}{" "}
              <span className="text-xs font-semibold text-slate-500">Credits</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Sender ID: <span className="font-mono font-bold text-slate-800">{senderId}</span>
            </div>
          </div>
        </div>
      </div>

      <SmsTestModeSwitch />

      {/* Gateway Information Notice Banner */}
      {!isConfigured && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              BulkSMSBD Sandbox Simulation Active
            </p>
            <p className="text-amber-800 leading-relaxed">
              Your platform is currently running in test sandbox mode. Dispatched SMS will be simulated with realistic delivery receipts without deducting real credits.
              To connect your real BulkSMSBD merchant account, add your API Key in your{" "}
              <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono font-bold">.env</code>:
              {" "}
              <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono">BULKSMSBD_API_KEY=&quot;your_key&quot;</code> and{" "}
              <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono">BULKSMSBD_SENDER_ID=&quot;SSGHS&quot;</code>.
            </p>
          </div>
        </div>
      )}

      {/* Broadcast Result Banner */}
      {broadcastFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 shadow-sm ${
            broadcastFeedback.success
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          {broadcastFeedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-sm">{broadcastFeedback.text}</div>
            {broadcastFeedback.success && (
              <div className="text-emerald-800 text-xs">
                Recipients: <span className="font-bold">{broadcastFeedback.sentCount}</span> •
                SMS Segments / Credits Used: <span className="font-bold">{broadcastFeedback.creditsUsed}</span> •
                Message ID: <span className="font-mono font-bold">{broadcastFeedback.messageId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Left = Contacts Selector, Right = Message Composer & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Contact List Picker (7 cols) ───────────────── */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Header & Filter Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" /> 1. Select Contact List
                </h2>
                <p className="text-[11px] text-slate-500">
                  Target verified alumni, batch reps, volunteers, or import phone numbers.
                </p>
              </div>

              {/* Selected Recipients Badge */}
              <div className="px-3 py-1 rounded-full bg-emerald-950 text-amber-300 font-bold text-xs self-start sm:self-auto flex items-center gap-1.5 shadow-xs">
                <span>{activeRecipientNumbers.length}</span>
                <span className="text-[10px] text-emerald-300 font-normal">Recipients Selected</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setGroupFilter("ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupFilter === "ALL"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                All Contacts ({contacts.length})
              </button>

              <button
                type="button"
                onClick={() => setGroupFilter("VERIFIED")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilter === "VERIFIED"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Verified Alumni
              </button>

              <button
                type="button"
                onClick={() => setGroupFilter("BATCH_REPS")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilter === "BATCH_REPS"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Class Reps
              </button>

              <button
                type="button"
                onClick={() => setGroupFilter("VOLUNTEERS")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilter === "VOLUNTEERS"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                Volunteers
              </button>

              <button
                type="button"
                onClick={() => setGroupFilter("BATCH")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilter === "BATCH"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                By SSC Batch
              </button>

              <button
                type="button"
                onClick={() => setGroupFilter("MANUAL")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  groupFilter === "MANUAL"
                    ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Custom Numbers / CSV
              </button>
            </div>

            {/* Batch Selector Sub-Filter */}
            {groupFilter === "BATCH" && (
              <div className="flex items-center gap-2 pt-2 animate-fade-in">
                <span className="text-xs font-bold text-slate-700">Choose Batch:</span>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value ? Number(e.target.value) : "")}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-emerald-600"
                >
                  <option value="">All Batches</option>
                  {availableBatches.map((b) => (
                    <option key={b} value={b}>
                      SSC Batch {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Bar & Select All (Visible when not in Manual mode) */}
            {groupFilter !== "MANUAL" && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone or batch..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-emerald-600 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {filteredContacts.length > 0 &&
                  filteredContacts.every((c) => selectedIds.has(c.id)) ? (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-500" /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Select All ({filteredContacts.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Contact Content Area */}
          {groupFilter === "MANUAL" ? (
            /* ── Manual Input / CSV Mode ── */
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Paste Phone Numbers (Comma or Newline Separated):
                </label>
                <textarea
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="01711234567&#10;01819345678&#10;8801912456789, 01612445566"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* CSV Upload */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                <Upload className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-800">Import from CSV / Text File</div>
                  <div className="text-[11px] text-slate-500">
                    Upload a file with phone numbers. Numbers will be automatically parsed and normalized.
                  </div>
                </div>
                <label className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0">
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Manual Parsing Results */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Valid BD Mobile Numbers</div>
                  <div className="text-lg font-black text-emerald-900 mt-0.5">
                    {manualParsedNumbers.length}
                  </div>
                  {manualParsedNumbers.length > 0 && (
                    <div className="text-[10px] text-emerald-700 font-mono mt-1 truncate">
                      {manualParsedNumbers.slice(0, 3).join(", ")}
                      {manualParsedNumbers.length > 3 && ` +${manualParsedNumbers.length - 3} more`}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Invalid / Skipped Entries</div>
                  <div className="text-lg font-black text-rose-900 mt-0.5">
                    {manualInvalidNumbers.length}
                  </div>
                  {manualInvalidNumbers.length > 0 && (
                    <div className="text-[10px] text-rose-700 font-mono mt-1 truncate">
                      {manualInvalidNumbers.slice(0, 2).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Contacts Directory Table ── */
            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
              {contactsLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading alumni contact directory...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No contacts found matching the active filter.
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isChecked = selectedIds.has(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={`p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        isChecked ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                            isChecked
                              ? "bg-emerald-700 border-emerald-700 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {contact.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {contact.name}
                            </span>
                            {contact.batch && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                Batch {contact.batch}
                              </span>
                            )}
                            {contact.category === "BATCH_REP" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                                Class Rep
                              </span>
                            )}
                            {contact.category === "VOLUNTEER" && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-300 shrink-0">
                                Volunteer
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {contact.phone}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {contact.status === "VERIFIED" ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            {contact.status || "Alumni"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Footer Selection Summary */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing <span className="font-bold">{filteredContacts.length}</span> contacts
            </span>
            <span className="font-semibold text-emerald-800">
              {activeRecipientNumbers.length} checked for broadcast
            </span>
          </div>
        </div>

        {/* ── Right Column: Message Composer & Smartphone Preview (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Message Composer Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" /> 2. Compose SMS
              </h2>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  metrics.isUnicode
                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                    : "bg-blue-100 text-blue-900 border border-blue-200"
                }`}
              >
                {metrics.isUnicode ? "Bangla / Unicode (70 chars/part)" : "English GSM-7 (160 chars/part)"}
              </span>
            </div>

            {/* Language Selector for Templates */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Select Template Language:
                </label>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> English saves up to 70% cost
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLang("en");
                    const tmpl = PRESET_TEMPLATES.find((t) => t.lang === "en");
                    if (tmpl) setMessage(tmpl.text);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    templateLang === "en"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>English (Cost-Saver)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLang("banglish");
                    const tmpl = PRESET_TEMPLATES.find((t) => t.lang === "banglish");
                    if (tmpl) setMessage(tmpl.text);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    templateLang === "banglish"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Banglish (Cost-Saver)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateLang("bn");
                    const tmpl = PRESET_TEMPLATES.find((t) => t.lang === "bn");
                    if (tmpl) setMessage(tmpl.text);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    templateLang === "bn"
                      ? "bg-amber-400 text-slate-950 font-black shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Bangla (Unicode)</span>
                </button>
              </div>

              {/* Template Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {PRESET_TEMPLATES.filter((t) => t.lang === templateLang).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setMessage(tmpl.text)}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 rounded-xl text-[11px] font-semibold transition-colors border border-slate-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{tmpl.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        tmpl.isCostSaver
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {tmpl.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bangla vs English Cost Warning / Optimizer */}
            {metrics.isUnicode ? (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2 text-amber-950 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Bangla Unicode Detected — High SMS Cost!</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-200/80 text-amber-950">
                    {metrics.partsCount} SMS Parts / Recipient
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Bangla text uses Unicode which limits each SMS to only <strong>70 characters</strong>. This message will consume{" "}
                  <strong>{metrics.partsCount} SMS parts ({totalCreditsNeeded} total credits)</strong>.
                  Switching to <strong>English GSM-7</strong> (up to 160 characters) will consume only{" "}
                  <strong>1 part ({activeRecipientNumbers.length} credits)</strong>, saving you{" "}
                  <strong>{Math.max(0, totalCreditsNeeded - activeRecipientNumbers.length)} credits ({Math.max(0, Math.round((1 - activeRecipientNumbers.length / Math.max(1, totalCreditsNeeded)) * 100))}% cost cut)</strong>!
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateLang("en");
                      const tmpl = PRESET_TEMPLATES.find((t) => t.lang === "en");
                      if (tmpl) setMessage(tmpl.text);
                    }}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Switch to 1-Part English (Save Credits)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateLang("banglish");
                      const tmpl = PRESET_TEMPLATES.find((t) => t.lang === "banglish");
                      if (tmpl) setMessage(tmpl.text);
                    }}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-900" /> Switch to Banglish (1 Part)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-emerald-900">Cost-Saver GSM-7 Active</div>
                    <div className="text-[10px] text-emerald-700">160 characters allowed per SMS segment.</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-200 text-emerald-900">
                  {metrics.partsCount === 1 ? "1 Credit / Alumnus (Optimal)" : `${metrics.partsCount} Credits / Alumnus`}
                </span>
              </div>
            )}

            {/* Textarea */}
            <div>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-emerald-600 text-slate-900 placeholder:text-slate-400 leading-relaxed font-sans"
              />

              {/* Character & Segment Counter Bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
                <div>
                  <span className="font-bold text-slate-800">{metrics.charCount}</span> chars •{" "}
                  <span className={`font-bold ${metrics.partsCount > 1 ? "text-amber-700" : "text-emerald-700"}`}>
                    {metrics.partsCount} SMS {metrics.partsCount > 1 ? "Parts" : "Part"}
                  </span>
                  <span className="text-slate-400 ml-1">
                    ({metrics.charsRemainingInPart} chars left in part)
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {metrics.isUnicode ? "70 chars/part (Unicode)" : "160 chars/part (GSM-7)"}
                </div>
              </div>
            </div>

            {/* Sender ID Customization (Optional) */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Sender ID / Masking:
              </label>
              <input
                type="text"
                value={customSenderId}
                onChange={(e) => setCustomSenderId(e.target.value)}
                placeholder={senderId}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600 font-mono text-slate-800"
              />
              <span className="text-[10px] text-slate-400">
                Default: <code className="font-mono">{senderId}</code> (approved on BulkSMSBD)
              </span>
            </div>

            {/* Cost & Segments Projection Box */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Recipients:</span>
                <span className="font-black text-emerald-950">{activeRecipientNumbers.length} alumni</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-medium">Segments per Recipient:</span>
                <span className={`font-black ${metrics.partsCount > 1 ? "text-amber-800" : "text-emerald-950"}`}>
                  {metrics.partsCount} part{metrics.partsCount > 1 ? "s" : ""} {metrics.isUnicode ? "(Bangla Unicode)" : "(English GSM)"}
                </span>
              </div>
              <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-emerald-950 font-bold">Total SMS Credits Required:</div>
                  <div className="text-[10px] text-emerald-700">
                    {metrics.isUnicode
                      ? "⚠️ Using 2x–3x more credits due to Bangla"
                      : "⚡ Cost-optimized rate (1 SMS part)"}
                  </div>
                </div>
                <span className="text-lg font-black text-emerald-900">
                  {totalCreditsNeeded}{" "}
                  <span className="text-xs font-semibold text-emerald-700">Credits</span>
                </span>
              </div>
            </div>

            {/* Main Action Broadcast Button */}
            <button
              type="button"
              disabled={activeRecipientNumbers.length === 0 || !message.trim() || isSending}
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3.5 bg-emerald-950 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-amber-300 font-black text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-400" />
              {isSending ? "Dispatching Broadcast..." : `Send Bulk SMS (${activeRecipientNumbers.length} Alumni)`}
            </button>

            {/* ── Single Test SMS Section ── */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" /> Send Single Test SMS First
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-600 font-mono"
                />
                <button
                  type="button"
                  disabled={testSending || !testPhone.trim()}
                  onClick={handleSendTestSms}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {testSending ? "Sending..." : "Test SMS"}
                </button>
              </div>

              {testFeedback && (
                <div
                  className={`mt-2 p-2 rounded-xl text-[11px] font-semibold ${
                    testFeedback.isError
                      ? "bg-rose-50 text-rose-800 border border-rose-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {testFeedback.text}
                </div>
              )}
            </div>
          </div>

          {/* ── Live Smartphone Screen Mockup Preview ── */}
          <div className="bg-slate-900 rounded-3xl p-4 text-white shadow-xl space-y-2 border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pb-1 border-b border-slate-800">
              <span className="font-mono font-bold">12:30 PM</span>
              <span className="font-semibold text-slate-300">Recipient Phone Preview</span>
              <span className="font-mono">5G • 100%</span>
            </div>

            {/* SMS Header */}
            <div className="text-center py-1">
              <div className="w-9 h-9 rounded-full bg-emerald-800 text-amber-300 font-bold mx-auto flex items-center justify-center text-xs shadow-xs">
                SS
              </div>
              <div className="text-xs font-bold text-white mt-1">{customSenderId || senderId}</div>
              <div className="text-[9px] text-slate-400">Verified BulkSMSBD Masking</div>
            </div>

            {/* Bubble */}
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl text-xs text-emerald-100 font-sans leading-relaxed shadow-inner">
              <p className="whitespace-pre-wrap">{message || "Your message will appear here..."}</p>
              <div className="text-[9px] text-emerald-400 text-right mt-1.5 font-mono">
                Now • Delivered
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Broadcast History & Audit Logs ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" /> Recent Bulk SMS Broadcasts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of SMS campaigns dispatched through the BulkSMSBD gateway.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchHistory}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} /> Refresh Log
          </button>
        </div>

        {historyLoading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No SMS broadcasts recorded yet. Send your first announcement above.
          </div>
        ) : (
          <div className="md:overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Sender ID</th>
                  <th className="py-2.5 px-3">Recipients</th>
                  <th className="py-2.5 px-3">Credits</th>
                  <th className="py-2.5 px-3">Message Snippet</th>
                  <th className="py-2.5 px-3">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group space-y-2 md:space-y-0 md:divide-y md:divide-slate-100 text-slate-700">
                {history.map((item) => (
                  <tr key={item.id} className="block md:table-row border border-slate-200 rounded-xl p-3 md:p-0 md:border-0 md:rounded-none hover:bg-slate-50/60 transition-colors">
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3 font-mono text-[11px] md:whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3 font-mono font-bold text-slate-900">
                      {item.senderId}
                    </td>
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3 font-bold text-emerald-800">
                      {item.validRecipients} contacts
                    </td>
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3 font-semibold text-slate-600">
                      {item.totalCreditsUsed} credits
                    </td>
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3 md:max-w-xs md:truncate text-slate-600" title={item.message}>
                      {item.message}
                    </td>
                    <td className="block md:table-cell py-0.5 md:py-3 md:px-3">
                      {item.status === "FAILED" ? (
                        <span title={item.error} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Failed{item.gatewayResponseCode ? ` (${item.gatewayResponseCode})` : ""}
                        </span>
                      ) : item.isSimulated ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Sandbox Simulated
                        </span>
                      ) : (
                        // 202 means the gateway accepted the batch; delivery to each phone is not reported.
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Accepted by gateway
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ──────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true" aria-label="Confirm SMS broadcast" className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Send className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm Bulk SMS Broadcast</h3>
                <p className="text-xs text-slate-500">
                  Please review the recipients and message details before launching.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recipients Count:</span>
                <span className="font-bold text-slate-900">{activeRecipientNumbers.length} numbers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">SMS Segments / Parts:</span>
                <span className="font-bold text-slate-900">{metrics.partsCount} parts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Credits to Deduct:</span>
                <span className="font-black text-emerald-700">{totalCreditsNeeded} credits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sender ID:</span>
                <span className="font-mono font-bold text-slate-900">{customSenderId || senderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Gateway Mode:</span>
                <span className="font-bold text-slate-900">
                  {isConfigured ? "BulkSMSBD Live Production" : "Sandbox Simulation Mode"}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Message Content:
              </label>
              <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-800 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
                {message}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBroadcast}
                className="flex-1 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-amber-300 text-xs font-black transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" /> Confirm &amp; Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
