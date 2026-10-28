import React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Handshake, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import { groupSponsors, listSponsors, type SponsorView } from "@/lib/sponsors";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/sponsors",
  image: null,
  title: "Our sponsors",
  description:
    "The sponsors and supporters of Praktan Sabujian Parishad, the alumni association of Sabuj Shikshayatan Government High School, Sitakunda.",
});

function Logo({ sponsor, size }: { sponsor: SponsorView; size: number }) {
  if (!sponsor.logoUrl) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 ring-4 ring-emerald-50">
        <Handshake className="w-1/3 h-1/3" />
      </div>
    );
  }
  return (
    <Image
      src={sponsor.logoUrl}
      alt={`${sponsor.nameEn ?? sponsor.name} logo`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-contain bg-white shrink-0 shadow-md ring-4 ring-emerald-50"
    />
  );
}

function Details({ sponsor, large = false }: { sponsor: SponsorView; large?: boolean }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <h3 className={`${large ? "text-2xl sm:text-3xl" : "text-lg"} font-black text-slate-900 leading-tight`}>{sponsor.name}</h3>
      {sponsor.nameEn && <p className="text-sm font-semibold text-slate-700">{sponsor.nameEn}</p>}
      {sponsor.address && (
        <p className={`flex items-center gap-1.5 text-sm text-slate-600 ${large ? "justify-center sm:justify-start" : "justify-center"}`}>
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          {sponsor.address}
        </p>
      )}
      {sponsor.note && <p className="text-sm text-slate-500 italic">{sponsor.note}</p>}
      {sponsor.website && (
        <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline`}>
          Visit website <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

export default async function SponsorsPage() {
  const groups = groupSponsors(await listSponsors({ publishedOnly: true }).catch(() => []));

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<Handshake className="w-3.5 h-3.5" />} eyebrow="পৃষ্ঠপোষক ও সহায়তাকারী" title="Our sponsors">
          The organisations and well-wishers who make the association&apos;s work possible. Thank you.
        </PageHero>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
          {groups.length === 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <p className="text-sm text-slate-600">Our sponsors will be listed here soon.</p>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.category} className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{g.labelBn}</p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{g.label}</h2>
              </div>
              {g.category === "INFRASTRUCTURE" ? (
                <div className="space-y-4">
                  {g.sponsors.map((s) => (
                    <div key={s.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-center sm:text-left">
                      <Logo sponsor={s} size={160} />
                      <Details sponsor={s} large />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.sponsors.map((s) => (
                    <div key={s.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col items-center gap-4 text-center">
                      <Logo sponsor={s} size={112} />
                      <Details sponsor={s} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          <section className="rounded-3xl bg-[#06281e] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold">Would you like to support the association?</h2>
              <p className="text-sm text-emerald-100 mt-1">Sponsor an event, a scholarship or the website. Write to the committee and we will get in touch.</p>
            </div>
            <Link href="/contact" className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shrink-0">
              Contact the committee
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
