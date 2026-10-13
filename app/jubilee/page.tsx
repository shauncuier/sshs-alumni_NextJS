import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CheckCircle2, Clock, Hourglass, MapPin, ArrowDown, Ticket } from "lucide-react";
import RegisterClientView from "@/app/register/RegisterClientView";
import { getMembershipEvent } from "@/lib/events/service";
import { formatDeadline, formatTaka } from "@/lib/events/pricing";
import { cleanSource, membershipEventStanding, type MembershipStanding } from "@/lib/events/registrations";
import { getMemberSession } from "@/lib/session-user";
import { eventDescription, pageMetadata, shareCard } from "@/lib/seo";
import { schoolInfo } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * The Golden Jubilee registration link for Facebook ads and posts: one event, one form,
 * nothing else to tap away to. It is light on purpose (no site menu or footer) for
 * phones on mobile data. Every registration made here is tagged with where the visitor
 * came from: the link's utm_source / utm_campaign (or ?src=), else "jubilee-link".
 * Example ad link: /jubilee?utm_source=facebook&utm_campaign=jubilee2026
 */

export async function generateMetadata(): Promise<Metadata> {
  const event = await getMembershipEvent().catch(() => null);
  return pageMetadata({
    path: "/jubilee",
    title: "সুবর্ণ জয়ন্তী ২০২৬ রেজিস্ট্রেশন · Golden Jubilee registration",
    absoluteTitle: true,
    description: event ? eventDescription(event) : "Register for the Golden Jubilee 2026 of Sabuj Shikshayatan Government High School, Sitakunda.",
    image: shareCard("jubilee"),
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** "bKash, Nagad or Cash" */
function listOr(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function JubileeRegistrationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tag = [first(params.utm_source) || first(params.src), first(params.utm_campaign)].filter(Boolean).join("/");
  const source = cleanSource(tag) ?? "jubilee-link";
  const event = await getMembershipEvent();

  // A signed-in member sees where they stand instead of the "pay and register" pitch.
  // (Only approved members and staff can hold a session; see getMemberSession.)
  const session = await getMemberSession();
  const userId = session?.user?.id ?? null;
  const standing: MembershipStanding = event && userId ? await membershipEventStanding(event.id, userId).catch(() => null) : null;
  const paid = standing === "TICKET" || standing === "REVIEW" || standing === "MEMBER";

  const date = event
    ? new Date(`${event.date}T12:00:00+06:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })
    : "";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Slim header: the crest, the name, and a way in for members. */}
      <header className="bg-[#06281e] text-white">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Image src="/logo.png" alt="" width={32} height={32} loading="eager" className="w-8 h-8 rounded-full bg-white shrink-0" />
            <span className="text-sm font-bold truncate">Sabuj Shikshayatan Alumni</span>
          </Link>
          {userId ? (
            <Link href="/dashboard" className="text-xs font-semibold text-emerald-200 hover:text-white shrink-0">
              My dashboard
            </Link>
          ) : (
            <Link href="/login?callbackUrl=/jubilee" className="text-xs font-semibold text-emerald-200 hover:text-white shrink-0">
              Member? Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* The event at a glance */}
        <section className="bg-gradient-to-b from-[#06281e] to-[#0b3d2c] text-white">
          <div className="max-w-2xl mx-auto px-4 pt-7 pb-8 space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black tracking-wide">
              {schoolInfo.established} — {event?.date.slice(0, 4) ?? "2026"} · 50 YEARS
            </span>
            <div>
              <h1 lang="bn" className="text-3xl sm:text-4xl font-extrabold text-amber-300 leading-tight">
                সুবর্ণ জয়ন্তী ২০২৬
              </h1>
              <p className="text-lg sm:text-xl font-bold mt-1">Golden Jubilee registration</p>
              <p className="text-sm text-emerald-100/90 mt-1">{schoolInfo.name}</p>
            </div>

            {event && (
              <ul className="space-y-1.5 text-sm text-emerald-50">
                <li className="flex items-start gap-2"><CalendarDays className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />{date}</li>
                {event.time && <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />{event.time}</li>}
                <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-amber-300 shrink-0" />{[event.venue, event.locationCity].filter(Boolean).join(", ")}</li>
              </ul>
            )}

            {paid && <StandingCard standing={standing} />}

            {!paid && event && event.registrationFeeAmount > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/10 border border-white/15 p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Member</div>
                  <div className="text-lg font-black">{formatTaka(event.registrationFeeAmount)}</div>
                </div>
                {event.guestTypes
                  .filter((g) => g.price > 0)
                  .slice(0, 2)
                  .map((g) => (
                    <div key={g.name} className="rounded-xl bg-white/10 border border-white/15 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">{g.name}</div>
                      <div className="text-lg font-black">+{formatTaka(g.price)}</div>
                    </div>
                  ))}
              </div>
            )}

            {!paid && event?.registrationDeadline && (
              <p className="text-xs text-emerald-100/80">Register by {formatDeadline(event.registrationDeadline)}.</p>
            )}

            {!paid && (
            <a
              href="#register"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg"
            >
              <span lang="bn">এখনই রেজিস্ট্রেশন করুন</span>
              <span aria-hidden>·</span>
              <span>Register now</span>
              <ArrowDown className="w-4 h-4" />
            </a>
            )}
          </div>
        </section>

        {/* How it works, in three steps (not for someone who has paid) */}
        {!paid && (
        <section className="max-w-2xl mx-auto px-4 pt-6 space-y-3">
          <h2 lang="bn" className="text-lg font-extrabold text-slate-900">কীভাবে রেজিস্ট্রেশন করবেন</h2>
          <ol className="space-y-2.5">
            {[
              ["আপনার তথ্য দিন", "Your name, SSC batch, a photo, and proof that you studied at the school (SSC certificate or marksheet)."],
              ["ফি পরিশোধ করুন", `Pay by ${listOr(event?.paymentMethods ?? []) || "bKash or Nagad"}, then enter the transaction ID.`],
              ["কমিটি নিশ্চিত করবে", "The committee checks your payment. You get an email, and your ticket QR code appears on your dashboard."],
            ].map(([bn, en], i) => (
              <li key={bn} className="flex gap-3 bg-white rounded-2xl border border-slate-200 p-3.5">
                <span className="w-7 h-7 rounded-full bg-emerald-800 text-amber-300 text-sm font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <span>
                  <span lang="bn" className="block text-sm font-bold text-slate-900">{bn}</span>
                  <span className="block text-xs text-slate-600 mt-0.5">{en}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        )}

        {/* The form (someone who has paid sees their standing above instead) */}
        {!paid && (
        <section id="register" className="max-w-2xl mx-auto px-4 pt-7 pb-10 space-y-3 scroll-mt-4">
          <h2 className="text-lg font-extrabold text-slate-900">
            Registration form <span lang="bn" className="text-slate-500 font-bold text-base">· রেজিস্ট্রেশন ফর্ম</span>
          </h2>
          <RegisterClientView initialEvent={event} source={source} compact />
        </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-5 text-xs text-slate-500 space-y-1.5">
          <p>
            Questions? <a href={`mailto:${schoolInfo.associationEmail}`} className="font-semibold text-emerald-800">{schoolInfo.associationEmail}</a>
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {event && <Link href={`/events/${event.slug}`} className="font-semibold text-emerald-800">Full programme</Link>}
            <Link href="/" className="font-semibold text-emerald-800">Alumni website</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Shown at the top to a signed-in member who has paid: what happens next, no payment. */
function StandingCard({ standing }: { standing: MembershipStanding }) {
  const card =
    standing === "TICKET"
      ? {
          icon: <Ticket className="w-5 h-5 text-amber-300 shrink-0" />,
          bn: "আপনার রেজিস্ট্রেশন নিশ্চিত হয়েছে",
          en: "You are registered. Your ticket is ready: show its QR code at the gate.",
          link: "View my ticket",
        }
      : standing === "REVIEW"
        ? {
            icon: <Hourglass className="w-5 h-5 text-amber-300 shrink-0" />,
            bn: "আপনার পেমেন্ট যাচাই করা হচ্ছে",
            en: "We have your payment. The committee is checking it; you get an email and your ticket once it is confirmed. Please do not pay again.",
            link: "See my registration",
          }
        : {
            icon: <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />,
            bn: "আপনি ইতিমধ্যে সদস্য, আবার ফি দেওয়ার প্রয়োজন নেই",
            en: "You are already a member, so your Golden Jubilee registration is paid. Please do not pay again.",
            link: "Go to my dashboard",
          };
  return (
    <div role="status" className="rounded-2xl bg-white/10 border border-amber-300/40 p-4 space-y-2">
      <p className="flex items-start gap-2.5">
        {card.icon}
        <span>
          <span lang="bn" className="block font-bold text-amber-200">{card.bn}</span>
          <span className="block text-sm text-emerald-50 mt-0.5">{card.en}</span>
        </span>
      </p>
      <Link href="/dashboard" className="flex items-center justify-center w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm">
        {card.link}
      </Link>
      {standing === "MEMBER" && (
        <p className="text-xs text-emerald-100/80">
          Ticket missing from your dashboard? Write to{" "}
          <a href={`mailto:${schoolInfo.associationEmail}`} className="font-semibold underline break-all">{schoolInfo.associationEmail}</a>.
        </p>
      )}
    </div>
  );
}
