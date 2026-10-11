"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, Users } from "lucide-react";
import { useRealtime } from "@/lib/hooks/useRealtime";

interface Partner {
  userId: string;
  profileId: string | null;
  fullName: string;
  sscBatch: number | null;
  avatarUrl: string;
}

interface Conversation {
  partnerId: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  partner: Partner | null;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  failed?: string;
}

const time = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

/** Real conversations from /api/messages; `initialTo` opens (or starts) a conversation with that member. */
export default function MessagesClient({ currentUserId, initialTo }: { currentUserId: string; initialTo: string | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialTo);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isConnected, lastMessage } = useRealtime(currentUserId);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load conversations.");
      setConversations(data.conversations);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const openThread = useCallback(async (partnerId: string) => {
    setActiveId(partnerId);
    setLoadingThread(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages?with=${encodeURIComponent(partnerId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load the conversation.");
      setMessages(data.messages);
      setPartner(data.partner);
      // Mark what they sent as read.
      await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senderId: partnerId }) }).catch(() => {});
      setConversations((list) => list.map((c) => (c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    if (initialTo) void openThread(initialTo);
  }, [loadConversations, openThread, initialTo]);

  // New messages arrive over the realtime stream.
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.senderId === activeId) {
      setMessages((prev) =>
        prev.some((m) => m.id === lastMessage.messageId)
          ? prev
          : [...prev, { id: lastMessage.messageId || String(Date.now()), senderId: lastMessage.senderId, receiverId: currentUserId, content: lastMessage.content, createdAt: String(lastMessage.createdAt) }]
      );
    }
    void loadConversations();
  }, [lastMessage, activeId, currentUserId, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !activeId) return;
    const temp: Message = { id: `tmp-${Date.now()}`, senderId: currentUserId, receiverId: activeId, content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, temp]);
    setInput("");
    try {
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: activeId, content: text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Message not sent.");
      const saved = data.message ?? data;
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, id: saved.id ?? m.id, createdAt: saved.createdAt ?? m.createdAt } : m)));
      void loadConversations();
    } catch (err) {
      // Never pretend a message was delivered.
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, failed: (err as Error).message } : m)));
    }
  };

  const showThread = activeId !== null;

  return (
    <div className="bg-white w-full rounded-3xl border border-slate-200 shadow-sm flex overflow-hidden h-[calc(100vh-11rem)] lg:h-[calc(100vh-8rem)]">
      {/* Conversation list (hidden on phones while a conversation is open) */}
      <aside className={`${showThread ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-slate-200 flex-col shrink-0`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">Conversations</h2>
          <span className={`flex items-center gap-1 text-[10px] font-bold ${isConnected ? "text-emerald-700" : "text-slate-400"}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-300"}`} /> {isConnected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {!loadingList && conversations.length === 0 && (
            <div className="p-6 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No conversations yet.</p>
              <Link href="/network" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800"><Users className="w-3.5 h-3.5" /> Find members to message</Link>
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.partnerId}
              type="button"
              onClick={() => void openThread(c.partnerId)}
              className={`w-full text-left p-3.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer ${c.partnerId === activeId ? "bg-emerald-50/70" : ""}`}
            >
              <img src={c.partner?.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{c.partner?.fullName ?? "Member"}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{time(c.lastTime)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 truncate">{c.lastMessage}</span>
                  {c.unreadCount > 0 && <span className="px-1.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold shrink-0">{c.unreadCount}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Thread */}
      <section className={`${showThread ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0 bg-slate-50/50`}>
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Choose a conversation, or find someone in the <Link href="/network" className="font-bold text-emerald-800">network</Link>.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="p-3.5 border-b border-slate-200 bg-white flex items-center gap-3">
              <button type="button" onClick={() => setActiveId(null)} aria-label="Back to conversations" className="md:hidden p-1.5 -ml-1 text-slate-500 cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
              {partner && <img src={partner.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover bg-slate-100" />}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{partner?.fullName ?? (loadingThread ? "Loading…" : "Member")}</p>
                {partner?.sscBatch && <p className="text-[11px] text-slate-500">SSC Batch {partner.sscBatch}</p>}
              </div>
              {partner?.profileId && (
                <Link href={`/alumni/${partner.profileId}`} className="ml-auto text-[11px] font-bold text-emerald-800 shrink-0">View profile</Link>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {!loadingThread && messages.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">No messages yet. Say hello{partner ? ` to ${partner.fullName}` : ""}.</p>
              )}
              {messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${mine ? "bg-emerald-800 text-white rounded-br-md" : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"}`}>
                      {m.content}
                      <div className={`text-[10px] mt-1 ${m.failed ? "text-rose-200 font-bold" : mine ? "text-emerald-200" : "text-slate-400"}`}>
                        {m.failed ? `Not sent: ${m.failed}` : time(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <p role="alert" className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50">{error}</p>}
            <form onSubmit={send} className="p-3 border-t border-slate-200 bg-white flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={5000}
                placeholder="Write a message"
                aria-label="Message"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="px-4 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
