import type { Metadata } from "next";
import { eventDateLabel } from "@/lib/events/date-label";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CheckCircle2, Clock, Hourglass, MapPin, ArrowDown, Ticket } from "lucide-react";
import RegisterClientView from "@/app/register/RegisterClientView";
import { getMembershipEvent } from "@/lib/events/service";
import { formatDeadline, formatTaka, memberFeeLines } from "@/lib/events/pricing";
import { cleanSource, membershipEventStanding, type MembershipStanding } from "@/lib/events/registrations";
import { getMemberSession } from "@/lib/session-user";
import { eventDescription, pageMetadata, shareCard } from "@/lib/seo";
import { schoolInfo } from "@/lib/data";
import FacebookIcon from "@/components/shared/FacebookIcon";

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

/** Whole days from now until `d` (rounded up), or null for a bad date. */
function daysUntil(d: Date): number | null {
  return Number.isNaN(d.getTime()) ? null : Math.ceil((d.getTime() - new Date().getTime()) / 86_400_000);
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

  const date = event ? eventDateLabel(event.date, event.dateTentative) : "";
  const deadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const daysLeft = deadline ? daysUntil(deadline) : null;
  const guestFees = (event?.guestTypes ?? []).filter((g) => g.price > 0);
  const feeLines = event ? memberFeeLines({ registrationFee: event.registrationFeeAmount, batchFees: event.batchFees, extraAdultFee: event.extraAdultFee, childFee: event.childFee, packages: [] }) : [];
  const steps: [string, string][] = [
    ["তথ্য দিন", "Details, photo and SSC proof"],
    ["ফি দিন", `${listOr(event?.paymentMethods ?? []) || "bKash or Nagad"}, then the transaction ID`],
    ["টিকিট পান", "Committee confirms; ticket by email"],
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f5]">
      <main className="flex-1">
        {/* Hero: the 50-years emblem, the name and the facts */}
        <section className="relative bg-[#072a1f] text-white overflow-hidden">
          <header className="relative z-10 max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <Image src="/logo.png" alt="" width={32} height={32} loading="eager" className="w-8 h-8 rounded-full bg-white shrink-0" />
              <span className="text-sm font-bold truncate">প্রাক্তন সবুজিয়ান পরিষদ</span>
            </Link>
            <Link
              href={userId ? "/dashboard" : "/login?callbackUrl=/jubilee"}
              className="text-xs font-semibold text-emerald-100 hover:text-white border border-white/20 rounded-full px-3 py-1.5 shrink-0"
            >
              {userId ? "My dashboard" : "Member? Sign in"}
            </Link>
          </header>

          {/* The association's logo */}
          <div className="relative max-w-3xl mx-auto px-4 pt-4 flex justify-center">
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-[2rem] bg-white p-2 shadow-2xl shadow-black/40 ring-4 ring-amber-300/40">
              <Image
                src="/logo-large.webp"
                alt="প্রাক্তন সবুজিয়ান পরিষদ, Praktan Sabujian Parishad"
                width={800}
                height={800}
                priority
                sizes="(max-width: 640px) 208px, 256px"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="relative max-w-3xl mx-auto px-4 mt-6 pb-20 text-center space-y-3">
            <p className="text-[11px] font-bold tracking-[0.25em] text-amber-300/90">
              {schoolInfo.established} — {event?.date.slice(0, 4) ?? "2026"}
            </p>
            <h1 lang="bn" className="text-4xl sm:text-5xl font-extrabold text-amber-300 leading-tight">
              সুবর্ণ জয়ন্তী ২০২৬
            </h1>
            <p className="text-lg sm:text-xl font-bold">Golden Jubilee · Alumni reunion</p>
            <p className="text-sm text-emerald-100/80">{schoolInfo.name}</p>

            {event && (
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden bg-white/10 border border-white/10 text-left text-sm">
                <li className="flex items-center gap-2.5 bg-[#0a3427] px-4 py-3">
                  <CalendarDays className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{date}</span>
                </li>
                {event.time && (
                  <li className="flex items-center gap-2.5 bg-[#0a3427] px-4 py-3">
                    <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{event.time}</span>
                  </li>
                )}
                <li className="flex items-center gap-2.5 bg-[#0a3427] px-4 py-3">
                  <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{[event.venue.replace(schoolInfo.name, "School"), event.locationCity].filter((v, i, all) => v && !(i > 0 && all[0]?.includes(v))).join(", ")}</span>
                </li>
              </ul>
            )}
          </div>
        </section>

        {/* The fee and the one button (or, for someone who has paid, where they stand) */}
        <section className="relative max-w-3xl mx-auto px-4 -mt-14">
          {paid ? (
            <StandingCard standing={standing} />
          ) : (
            event && (
              <div className="bg-white rounded-3xl shadow-xl shadow-emerald-950/10 border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div className="w-full">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Registration fee</p>
                    {feeLines.length === 1 ? (
                      <p className="text-4xl font-black text-slate-900 leading-none mt-1">
                        {formatTaka(feeLines[0].price)}
                        <span className="text-sm font-semibold text-slate-500"> / alumnus</span>
                      </p>
                    ) : (
                      // Different fees by SSC batch: one row each.
                      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {feeLines.map((l) => (
                          <li key={l.label} className="flex items-baseline justify-between gap-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 px-4 py-2.5">
                            <span className="text-xs font-bold text-emerald-900">{l.label}</span>
                            <span className="text-2xl font-black text-slate-900">{formatTaka(l.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {guestFees.length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-xs">
                      {guestFees.map((g) => (
                        <li key={g.name} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-100 font-semibold">
                          {g.name} <span className="text-sm font-bold">+{formatTaka(g.price)}</span>
                          {g.max > 1 ? " each" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <a
                  href="#register"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-base shadow-md"
                >
                  <span lang="bn">রেজিস্ট্রেশন করুন</span>
                  <span aria-hidden className="text-emerald-300">·</span>
                  <span>Register now</span>
                  <ArrowDown className="w-4 h-4" />
                </a>

                {deadline && (
                  <p className="text-xs text-slate-500 text-center">
                    Registration closes {formatDeadline(event.registrationDeadline)}
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                      </span>
                    )}
                  </p>
                )}
              </div>
            )
          )}
        </section>

        {/* How it works: three short steps */}
        {!paid && (
          <section className="max-w-3xl mx-auto px-4 pt-8">
            <ol className="grid grid-cols-3 gap-2 sm:gap-4">
              {steps.map(([bn, en], i) => (
                <li key={bn} className="relative text-center">
                  {i < steps.length - 1 && <span aria-hidden className="absolute top-5 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-px bg-emerald-200" />}
                  <span className="mx-auto w-10 h-10 rounded-full bg-emerald-900 text-amber-300 text-sm font-black flex items-center justify-center">{i + 1}</span>
                  <span lang="bn" className="block mt-2 text-sm font-bold text-slate-900">{bn}</span>
                  <span className="block mt-0.5 text-[11px] leading-snug text-slate-500">{en}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The form */}
        {!paid && (
          <section id="register" className="max-w-3xl mx-auto px-4 pt-8 pb-12 space-y-3 scroll-mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">Registration form</h2>
              <span lang="bn" className="text-sm font-bold text-slate-400">রেজিস্ট্রেশন ফর্ম</span>
            </div>
            <RegisterClientView initialEvent={event} source={source} compact />
          </section>
        )}
        {paid && <div className="h-12" />}
      </main>

      <footer className="bg-[#072a1f] text-emerald-100/80">
        <div className="max-w-3xl mx-auto px-4 py-6 text-xs space-y-3">
          <p>
            Questions? Write to{" "}
            <a href={`mailto:${schoolInfo.associationEmail}`} className="font-semibold text-white underline-offset-2 hover:underline break-all">
              {schoolInfo.associationEmail}
            </a>
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-2">
            <a href={schoolInfo.facebookGroup} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-amber-300">
              <FacebookIcon className="w-3.5 h-3.5" /> Alumni Facebook group
            </a>
            {event && (
              <Link href={`/events/${event.slug}`} className="font-semibold text-white hover:text-amber-300">
                Full programme
              </Link>
            )}
            <Link href="/" className="font-semibold text-white hover:text-amber-300">
              Alumni website
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Shown in place of the fee card to a signed-in member who has paid: what happens next, no payment. */
function StandingCard({ standing }: { standing: MembershipStanding }) {
  const card =
    standing === "TICKET"
      ? {
          icon: <Ticket className="w-6 h-6 text-emerald-700" />,
          bn: "আপনার রেজিস্ট্রেশন নিশ্চিত হয়েছে",
          en: "You are registered. Your ticket is ready: show its QR code at the gate.",
          link: "View my ticket",
        }
      : standing === "REVIEW"
        ? {
            icon: <Hourglass className="w-6 h-6 text-amber-600" />,
            bn: "আপনার পেমেন্ট যাচাই করা হচ্ছে",
            en: "We have your payment. The committee is checking it; you get an email and your ticket once it is confirmed. Please do not pay again.",
            link: "See my registration",
          }
        : {
            icon: <CheckCircle2 className="w-6 h-6 text-emerald-700" />,
            bn: "আপনি ইতিমধ্যে সদস্য, আবার ফি দেওয়ার প্রয়োজন নেই",
            en: "You are already a member, so your Golden Jubilee registration is paid. Please do not pay again.",
            link: "Go to my dashboard",
          };
  return (
    <div role="status" className="bg-white rounded-3xl shadow-xl shadow-emerald-950/10 border border-slate-200 p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">{card.icon}</span>
        <div>
          <p lang="bn" className="font-bold text-slate-900">{card.bn}</p>
          <p className="text-sm text-slate-600 mt-0.5">{card.en}</p>
        </div>
      </div>
      <Link href="/dashboard" className="flex items-center justify-center w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-black text-sm">
        {card.link}
      </Link>
      {standing === "MEMBER" && (
        <p className="text-xs text-slate-500 text-center">
          Ticket missing from your dashboard? Write to{" "}
          <a href={`mailto:${schoolInfo.associationEmail}`} className="font-semibold text-emerald-800 underline break-all">{schoolInfo.associationEmail}</a>.
        </p>
      )}
    </div>
  );
}
