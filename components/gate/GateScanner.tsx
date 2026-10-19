"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import CameraScanner from "@/components/gate/CameraScanner";
import { CheckCircle2, Clock, Keyboard, ShieldCheck, Users, UtensilsCrossed, XCircle } from "lucide-react";
import { TOKEN_KINDS, TOKEN_QR_PREFIX, isTokenKind, tokenKind, type TokenKind } from "@/lib/events/token-kinds";

interface GateEvent {
  id: string;
  title: string;
  date: string;
}

interface ScanResult {
  ok: boolean;
  title: string;
  detail: string;
}

interface ScanLog {
  id: string;
  ok: boolean;
  name: string;
  detail: string;
  time: string;
}

const EVENT_KEY = "gate.eventId";
// What this phone is doing: the entrance (tickets) or one food / kit counter (tokens).
const COUNTER_KEY = "gate.counter";
type Counter = "ENTRANCE" | TokenKind;
const REPEAT_MS = 4000; // the same code held in front of the camera is read many times a second
const RESUME_MS = 1500; // pause after each scan so the result can be read

/** A short tone and vibration: high for "come in", low for "stop". */
function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [60, 60, 60]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    osc.onended = () => void ctx.close();
  } catch {
    // Sound and vibration are extras.
  }
}

// Rendered by app/gate/page.tsx, which checks the gate-staff role on the server.
export default function GateScanner() {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [eventsError, setEventsError] = useState(false);
  const [eventId, setEventIdState] = useState<string>("");
  const [counts, setCounts] = useState<{ checkedIn: number; expected: number; people: number } | null>(null);
  const [counter, setCounterState] = useState<Counter>("ENTRANCE");
  const [tokenStats, setTokenStats] = useState<Record<TokenKind, { used: number; total: number }> | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [log, setLog] = useState<ScanLog[]>([]);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const setEventId = (id: string) => {
    setEventIdState(id);
    try {
      localStorage.setItem(EVENT_KEY, id);
    } catch {}
  };

  const setCounter = (c: Counter) => {
    setCounterState(c);
    try {
      localStorage.setItem(COUNTER_KEY, c);
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COUNTER_KEY);
      if (saved && isTokenKind(saved)) setCounterState(saved); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/events/verify-ticket", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Events request failed (${res.status})`);
        return res.json();
      })
      .then((data: { events: GateEvent[] }) => {
        setEvents(data.events);
        let saved = "";
        try {
          saved = localStorage.getItem(EVENT_KEY) ?? "";
        } catch {}
        const pick = data.events.find((e) => e.id === saved) ?? data.events[0];
        if (pick) setEventIdState(pick.id);
      })
      .catch(() => setEventsError(true));
  }, []);

  const refreshCounts = useCallback(async (id: string) => {
    if (!id) return setCounts(null);
    const res = await fetch(`/api/events/verify-ticket?eventId=${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setCounts(await res.json());
  }, []);

  const refreshTokenStats = useCallback(async (id: string) => {
    if (!id) return setTokenStats(null);
    const res = await fetch(`/api/events/redeem-token?eventId=${encodeURIComponent(id)}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setTokenStats(await res.json());
  }, []);

  useEffect(() => {
    void refreshCounts(eventId); // eslint-disable-line react-hooks/set-state-in-effect
  }, [eventId, refreshCounts]);

  useEffect(() => {
    if (counter !== "ENTRANCE") void refreshTokenStats(eventId); // eslint-disable-line react-hooks/set-state-in-effect
  }, [eventId, counter, refreshTokenStats]);

  const record = (r: ScanResult) => {
    setResult(r);
    feedback(r.ok);
    setLog((prev) => [{ id: `${Date.now()}`, ok: r.ok, name: r.title, detail: r.detail, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 50));
  };

  const verify = async (raw: string) => {
    const code = raw.trim();
    if (!code || busy) return;
    setBusy(true);
    setPaused(true);
    try {
      if (code.startsWith(TOKEN_QR_PREFIX)) {
        // A food or kit token: only at a food counter, and only the counter's own kind.
        if (counter === "ENTRANCE") {
          record({ ok: false, title: "Food token", detail: "This is a food / kit token, not an entry ticket. Switch this phone to that food counter to serve it." });
        } else {
          const res = await fetch("/api/events/redeem-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, eventId: eventId || undefined, kind: counter }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            const k = tokenKind(data.kind);
            record({
              ok: true,
              title: data.name,
              detail: `${data.batch ? `SSC ${data.batch} · ` : ""}${k?.en ?? data.kind}${k?.perPerson ? ` · person ${data.person} of ${data.people}` : ""}`,
            });
            void refreshTokenStats(eventId);
          } else {
            record({ ok: false, title: "Do not serve", detail: data.message || data.error || "Token check failed." });
          }
        }
      } else if (code.startsWith("SSGHS-TICKET:") && counter !== "ENTRANCE") {
        record({ ok: false, title: "Entry ticket", detail: "This is the entry ticket, not a food token. Ask for the printed food token." });
      } else if (code.startsWith("SSGHS-TICKET:")) {
        const res = await fetch("/api/events/verify-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, eventId: eventId || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          record({
            ok: true,
            title: data.attendee.name,
            detail: `${data.attendee.batch ? `SSC ${data.attendee.batch} · ` : ""}${data.packageName ?? "Ticket"} · ${data.headCount} ${data.headCount === 1 ? "person" : "people"}`,
          });
          void refreshCounts(eventId);
        } else {
          record({ ok: false, title: "Do not let in", detail: data.message || data.error || "Ticket check failed." });
        }
      } else {
        // An alumni card (QR or its /verify/ link): shows who the member is; it is not an event ticket.
        const token = code.includes("/verify/") ? code.split("/verify/")[1].split("?")[0] : code;
        const res = await fetch("/api/alumni/card/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, gateId: "GATE" }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.valid && data.alumnus) {
          record({ ok: true, title: data.alumnus.fullName, detail: `Alumni card · SSC ${data.alumnus.sscBatch} · not an event ticket` });
        } else {
          record({ ok: false, title: "Not recognised", detail: data.error || "This QR code is not a ticket or an alumni card." });
        }
      }
    } catch {
      record({ ok: false, title: "No connection", detail: "Could not reach the server. Check the internet and scan again." });
    } finally {
      setBusy(false);
      window.setTimeout(() => setPaused(false), RESUME_MS);
    }
  };

  const onCameraCode = (text: string) => {
    const now = Date.now();
    if (text === lastScan.current.code && now - lastScan.current.at < REPEAT_MS) return;
    lastScan.current = { code: text, at: now };
    void verify(text);
  };

  const selected = events.find((e) => e.id === eventId);

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Gate check-in" />

        <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4">
          {/* Event being checked in */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label htmlFor="gate-event" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" /> Checking in for
            </label>
            {eventsError ? (
              <p role="alert" className="text-xs text-rose-700">Couldn&apos;t load the event list. Tickets are still checked, for any event. Refresh to try again.</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming events. Tickets are still checked, for any event.</p>
            ) : (
              <select id="gate-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full px-3 py-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold">
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} · {e.date}</option>
                ))}
              </select>
            )}
            <div>
              <label htmlFor="gate-counter" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <UtensilsCrossed className="w-4 h-4 text-emerald-700" /> This phone is at
              </label>
              <select
                id="gate-counter"
                value={counter}
                onChange={(e) => setCounter(e.target.value as Counter)}
                className="w-full px-3 py-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold"
              >
                <option value="ENTRANCE">Entrance · tickets (প্রবেশপথ)</option>
                {TOKEN_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.en} counter · tokens ({k.bn})
                  </option>
                ))}
              </select>
            </div>
            {counter !== "ENTRANCE" && tokenStats && selected && (
              <div className="flex items-center gap-2 text-xs">
                <UtensilsCrossed className="w-4 h-4 text-emerald-700" />
                <span className="font-black text-emerald-800 text-base">{tokenStats[counter].used}</span>
                <span className="text-slate-500">
                  of {tokenStats[counter].total} {tokenKind(counter)?.en.toLowerCase()} tokens served
                </span>
              </div>
            )}
            {counter === "ENTRANCE" && counts && selected && (
              <div className="flex items-center gap-2 text-xs">
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="font-black text-emerald-800 text-base">{counts.checkedIn}</span>
                <span className="text-slate-500">of {counts.expected} tickets in · {counts.people} people</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-4">
              {/* Result first on a phone: it is what the volunteer looks at */}
              {result && (
                <div role="status" className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${result.ok ? "bg-emerald-50 border-emerald-500 text-emerald-950" : "bg-rose-50 border-rose-500 text-rose-950"}`}>
                  {result.ok ? <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" /> : <XCircle className="w-8 h-8 text-rose-600 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-wider">
                      {counter === "ENTRANCE" ? (result.ok ? "Let in" : "Stop") : result.ok ? "Serve" : "Don't serve"}
                    </p>
                    <p className="text-lg font-black leading-tight break-words">{result.title}</p>
                    <p className="text-xs mt-0.5">{result.detail}</p>
                  </div>
                </div>
              )}

              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <CameraScanner onCode={onCameraCode} paused={paused} />

                {/* Typed or pasted code, or a USB/Bluetooth QR reader that types */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void verify(manual).then(() => setManual(""));
                  }}
                  className="space-y-1.5"
                >
                  <label htmlFor="gate-manual" className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" /> Or type / paste the code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gate-manual"
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      placeholder={counter === "ENTRANCE" ? "SSGHS-TICKET:…" : "SSGHS-TOKEN:…"}
                      autoComplete="off"
                      className="flex-1 min-w-0 px-3 py-3 min-h-[48px] bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button type="submit" disabled={busy || !manual.trim()} className="px-4 min-h-[48px] bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer">
                      Check
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* This device's scans */}
            <div className="lg:col-span-5">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" /> Scans on this phone
                </h3>
                {log.length === 0 ? (
                  <p className="text-xs text-slate-400">Nothing scanned yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-xs">
                    {log.map((s) => (
                      <li key={s.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-bold truncate ${s.ok ? "text-slate-900" : "text-rose-700"}`}>{s.name}</p>
                          <p className="text-slate-500 truncate">{s.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{s.time}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
