"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckSquare, Printer, Search, Square } from "lucide-react";
import IdCardPrintSheet, { printCardSheet, type PrintMode } from "@/components/card/IdCardPrintSheet";
import { IdCardBack, IdCardFront, siteHost } from "@/components/card/MemberIdCard";
import type { CardCandidate, MemberCard } from "@/lib/member-card";
import { avatarAt } from "@/lib/avatar";

const MAX = 200;

export default function IdCardBulkPrint() {
  const [members, setMembers] = useState<CardCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<PrintMode>("pair");
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<{ cards: MemberCard[]; site: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/id-cards", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not load members.");
        setMembers(body.members);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const batches = useMemo(() => [...new Set(members.map((m) => m.sscBatch))].sort((a, b) => a - b), [members]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        (batch === "all" || String(m.sscBatch) === batch) &&
        (!onlyWithPhoto || m.hasPhoto) &&
        (!q || m.fullName.toLowerCase().includes(q))
    );
  }, [members, batch, query, onlyWithPhoto]);

  const allShownSelected = shown.length > 0 && shown.every((m) => selected.has(m.userId));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of shown) {
        if (allShownSelected) next.delete(m.userId);
        else next.add(m.userId);
      }
      return next;
    });

  const chosen = members.filter((m) => selected.has(m.userId));
  const missingPhotos = chosen.filter((m) => !m.hasPhoto).length;
  const pages = mode === "pair" ? Math.ceil(chosen.length / 5) : Math.ceil(chosen.length / 10) * 2;
  const preview = chosen[0] ?? shown[0];

  const print = async () => {
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/id-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: chosen.map((m) => m.userId) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not prepare the cards.");
      setSheet({ cards: body.cards, site: siteHost(body.origin) });
      await printCardSheet();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      {/* Choose members */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <label className="relative">
            <span className="sr-only">Search by name</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </label>
          <label>
            <span className="sr-only">SSC batch</span>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="w-full sm:w-44 px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <button type="button" onClick={toggleAllShown} disabled={shown.length === 0} className="inline-flex items-center gap-2 font-bold text-emerald-800 disabled:opacity-40 cursor-pointer">
              {allShownSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {allShownSelected ? "Unselect" : "Select"} all {shown.length} shown
            </button>
            <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
              <input type="checkbox" checked={onlyWithPhoto} onChange={(e) => setOnlyWithPhoto(e.target.checked)} className="w-4 h-4 accent-emerald-700" />
              Only members with a photo
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
            {error}
          </p>
        )}

        <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {loading && <li className="p-4 text-sm text-slate-500">Loading members…</li>}
          {!loading && shown.length === 0 && <li className="p-4 text-sm text-slate-500">No approved members match.</li>}
          {shown.map((m) => {
            const on = selected.has(m.userId);
            return (
              <li key={m.userId}>
                <label className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${on ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(m.userId)} className="w-4 h-4 accent-emerald-700 shrink-0" />
                  <img src={avatarAt(m.avatarUrl, 40, m.fullName)} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{m.fullName}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      Batch {m.sscBatch}
                      {m.profession ? ` · ${m.profession}` : ""}
                    </span>
                  </span>
                  {!m.hasPhoto && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">No photo</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Print settings and preview */}
      <aside className="space-y-4 lg:sticky lg:top-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {chosen.length} card{chosen.length === 1 ? "" : "s"} selected
            </p>
            {chosen.length > 0 && (
              <p className="text-xs text-slate-500">
                {pages} A4 page{pages === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-slate-700 mb-1">Layout</legend>
            {(
              [
                ["pair", "Front and back side by side", "5 members a page. Cut out, fold or laminate back to back."],
                ["duplex", "Double-sided printer", "10 fronts a page, backs on the next page. Flip on the long edge."],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${mode === value ? "border-emerald-600 bg-emerald-50/60" : "border-slate-200"}`}
              >
                <input type="radio" name="layout" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-0.5 accent-emerald-700" />
                <span>
                  <span className="block text-xs font-bold text-slate-900">{title}</span>
                  <span className="block text-[11px] text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {missingPhotos > 0 && (
            <p className="flex gap-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {missingPhotos} selected member{missingPhotos === 1 ? " has" : "s have"} no photo; their card shows initials.
            </p>
          )}
          {chosen.length > MAX && (
            <p role="alert" className="text-[11px] font-semibold text-rose-700">
              Print up to {MAX} cards at a time.
            </p>
          )}

          <button
            type="button"
            onClick={() => void print()}
            disabled={busy || chosen.length === 0 || chosen.length > MAX}
            className="w-full min-h-[44px] rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {busy ? "Preparing cards…" : `Print ${chosen.length || ""} card${chosen.length === 1 ? "" : "s"}`}
          </button>
          <p className="text-[11px] text-slate-500">In the print window choose A4, scale 100% (actual size) and turn on “background graphics”.</p>
        </div>

        {preview && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700">Preview</p>
            <div className="flex flex-col items-center gap-3">
              <div className="[zoom:0.9] rounded-[3mm] shadow-md">
                <IdCardFront card={{ alumniId: "SSGHS-ALM-0000-XXXXXX", fullName: preview.fullName, sscBatch: preview.sscBatch, profession: preview.profession, avatarUrl: preview.avatarUrl }} />
              </div>
              <div className="[zoom:0.9] rounded-[3mm] shadow-md">
                <IdCardBack card={{ alumniId: "SSGHS-ALM-0000-XXXXXX", fullName: preview.fullName, sscBatch: preview.sscBatch }} site="" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center">Member number and QR are filled in when printing.</p>
          </div>
        )}
      </aside>

      {sheet && <IdCardPrintSheet cards={sheet.cards} site={sheet.site} mode={mode} />}
    </div>
  );
}
