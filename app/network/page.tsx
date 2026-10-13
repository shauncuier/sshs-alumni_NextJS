import React from "react";
import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { BadgeCheck, ChevronLeft, ChevronRight, Mail, MessageSquare, Phone, Search, Users } from "lucide-react";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import { searchMembers } from "@/lib/network";
import { getSessionUser } from "@/lib/session-user";
import { avatarAt } from "@/lib/avatar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alumni network | SSGHS Alumni" };

type Props = { searchParams: Promise<{ q?: string; batch?: string; page?: string }> };

// Verified members to find and message. No connection requests: any member can
// open a profile or start a conversation.
export default async function NetworkPage({ searchParams }: Props) {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/network");
  const params = await searchParams;
  const { members, total, page, pageSize, batches } = await searchMembers({ viewerId: me.id, q: params.q, batch: params.batch, page: Number(params.page) || 1 });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.batch) qs.set("batch", params.batch);
    qs.set("page", String(p));
    return `/network?${qs}`;
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <AppHeader title="Alumni Network" />
        <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5">
          <Form action="/network" className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search by name, profession, company or city"
                aria-label="Search members"
                className="w-full py-2 text-base sm:text-sm bg-transparent focus:outline-none"
              />
            </div>
            <select name="batch" defaultValue={params.batch ?? ""} aria-label="SSC batch" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm">
              <option value="">All batches</option>
              {batches.map((b) => <option key={b} value={b}>SSC {b}</option>)}
            </select>
            <button type="submit" className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold">Search</button>
          </Form>

          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {total} verified member{total === 1 ? "" : "s"}
            {params.q || params.batch ? " match" : ""}
          </p>

          {members.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No members found</p>
              <p className="text-xs text-slate-500 mt-1">Try another name or batch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <div key={m.userId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <img src={avatarAt(m.avatarUrl, 56, m.fullName)} alt={m.fullName} className="w-14 h-14 rounded-2xl object-cover border border-emerald-100 shrink-0" loading="lazy" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/alumni/${m.profileId}`} className="font-bold text-sm text-slate-900 hover:underline truncate">{m.fullName}</Link>
                        <BadgeCheck className="w-4 h-4 fill-emerald-600 text-white shrink-0" aria-label="Verified member" />
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md inline-block">SSC Batch {m.sscBatch}</span>
                      <div className="text-xs text-slate-600 truncate">{m.profession}{m.company ? ` · ${m.company}` : ""}</div>
                      <div className="text-[11px] text-slate-400">{m.locationCity}, {m.locationCountry}</div>
                      {(m.phone || m.email) && (
                        <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 break-all">
                          {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1"><Phone className="w-3 h-3" /> {m.phone}</a>}
                          {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1"><Mail className="w-3 h-3" /> {m.email}</a>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <Link href={`/alumni/${m.profileId}`} className="py-2 text-center border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50">View profile</Link>
                    <Link href={`/messages?to=${m.userId}`} className="py-2 text-center bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3 text-xs" aria-label="Pages">
              {page > 1 ? <Link href={pageHref(page - 1)} className="p-2 border border-slate-200 rounded-xl bg-white" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></Link> : <span className="p-2 opacity-30"><ChevronLeft className="w-4 h-4" /></span>}
              <span className="font-bold text-slate-600">{page} / {pages}</span>
              {page < pages ? <Link href={pageHref(page + 1)} className="p-2 border border-slate-200 rounded-xl bg-white" aria-label="Next page"><ChevronRight className="w-4 h-4" /></Link> : <span className="p-2 opacity-30"><ChevronRight className="w-4 h-4" /></span>}
            </nav>
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
