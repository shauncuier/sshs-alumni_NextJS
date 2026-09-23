"use client";

import React, { useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { sampleAlumni } from "@/lib/data";
import {
  Send,
  Image,
  Search,
  CheckCircle2,
  Phone,
  Video,
  MoreVertical,
  Paperclip
} from "lucide-react";

interface MessageEntry {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

export default function MessagesPage() {
  const [selectedAlumnusId, setSelectedAlumnusId] = useState("alm-2"); // Dr. Nusrat Jahan
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<MessageEntry[]>([
    { id: "1", sender: "them", text: "Salam Jashedul! Are you attending the Grand Alumni Reunion on Nov 20?", time: "10:30 AM" },
    { id: "2", sender: "me", text: "Wa alaikum assalam Nusrat! Yes, already registered. Batch 2008 is also organizing an informal dinner meetup!", time: "10:32 AM" },
    { id: "3", sender: "them", text: "That sounds wonderful. Let's make sure our retired teachers receive special crests during the morning session.", time: "10:35 AM" },
  ]);

  const activeAlumnus =
    sampleAlumni.find((a) => a.id === selectedAlumnusId) || sampleAlumni[1];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg: MessageEntry = {
      id: Date.now().toString(),
      sender: "me",
      text: messageInput.trim(),
      time: "Just now",
    };

    setMessages([...messages, newMsg]);
    setMessageInput("");

    // Simulate response after 1 second
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "them",
          text: "Agreed! Looking forward to coordinating with you.",
          time: "Just now",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 h-screen overflow-hidden">
        <AppHeader title="Direct Messages" />

        <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto p-4 sm:p-6">
          <div className="bg-white w-full rounded-3xl border border-slate-200 shadow-sm flex overflow-hidden">
            {/* Left 4 cols: Conversations List */}
            <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {sampleAlumni.slice(1, 6).map((alumnus) => {
                  const isSelected = alumnus.id === selectedAlumnusId;
                  return (
                    <div
                      key={alumnus.id}
                      onClick={() => setSelectedAlumnusId(alumnus.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={alumnus.avatarUrl}
                          alt={alumnus.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {alumnus.fullName}
                          </span>
                          <span className="text-[10px] text-slate-400">10:35 AM</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          SSC &apos;{alumnus.sscBatch} • {alumnus.profession}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
              {/* Active Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={activeAlumnus.avatarUrl}
                      alt={activeAlumnus.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-300"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                      {activeAlumnus.fullName}
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      SSC Batch {activeAlumnus.sscBatch} • Online
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.map((m) => {
                  const isMe = m.sender === "me";
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-emerald-800 text-white rounded-br-xs"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {m.time}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
              >
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Attach File"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
