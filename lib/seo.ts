import type { Metadata } from "next";
import { schoolInfo } from "@/lib/data";
import type { PublicEvent } from "@/lib/events/types";
import { memberFeeLabel, memberFeeRange } from "@/lib/events/pricing";
import type { AlumniStoryItem, NewsItem } from "@/lib/data";
import type { JobListing } from "@/lib/career-data";

/**
 * Search and share metadata in one place. People search for the school by name
 * ("Sabuj Shikshayatan", "সবুজ শিক্ষায়তন"), not "SSGHS", so titles end with
 * SITE_NAME (the root layout's title template). Every page gets a canonical URL;
 * openGraph is repeated in full because Next replaces a parent's openGraph object
 * instead of merging it.
 */

export const SITE_NAME = "Sabuj Shikshayatan Alumni";
export const ASSOCIATION_NAME = "Sabuj Shikshayatan Alumni Association";
export const ASSOCIATION_NAME_BN = "সবুজ শিক্ষায়তন প্রাক্তন ছাত্র-ছাত্রী পরিষদ";
/** The 1200x630 share cards in public/og (design/share-cards/make_cards.py), one per section. */
export const SHARE_CARDS = {
  home: "Sabuj Shikshayatan Alumni Association",
  jubilee: "Golden Jubilee 2026 of Sabuj Shikshayatan Government High School",
  events: "Events and reunions of the Sabuj Shikshayatan alumni",
  alumni: "Sabuj Shikshayatan alumni directory",
  batches: "SSC batches of Sabuj Shikshayatan Government High School",
  school: "Sabuj Shikshayatan Government High School, since 1976",
  about: "About the Sabuj Shikshayatan Alumni Association",
  news: "News and notices from the Sabuj Shikshayatan alumni",
  stories: "Stories from Sabuj Shikshayatan alumni",
  achievements: "Achievements of Sabuj Shikshayatan alumni",
  gallery: "Photo gallery of the Sabuj Shikshayatan alumni",
  donate: "Give back to Sabuj Shikshayatan Government High School",
  careers: "Jobs shared by Sabuj Shikshayatan alumni",
  mentorship: "Mentorship from Sabuj Shikshayatan alumni",
  register: "Join the Sabuj Shikshayatan Alumni Association",
  contact: "Contact the Sabuj Shikshayatan alumni committee",
  volunteer: "Volunteer for the Sabuj Shikshayatan alumni",
} as const;
export type ShareCard = keyof typeof SHARE_CARDS;

export function shareCard(key: ShareCard) {
  return { url: `/og/${key}.jpg`, width: 1200, height: 630, alt: SHARE_CARDS[key] };
}

export const DEFAULT_SHARE_IMAGE = shareCard("home");

/** An uploaded photo, or the section card when there is none (the jubilee artwork is only a stand-in). */
export function ownImageOr(url: string | null | undefined, fallback: ShareCard) {
  return url && !url.startsWith("/golden-jubilee") ? { url } : shareCard(fallback);
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Trims to a search-result-friendly length on a word boundary. */
export function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length).replace(/[,.;:\s]+$/, "")}…`;
}

export function pageMetadata(p: {
  path: string;
  title: string;
  description: string;
  /** The title is complete; no " | Sabuj Shikshayatan Alumni" suffix. */
  absoluteTitle?: boolean;
  /** The share image; "file" leaves it to the segment's opengraph-image file. */
  image?: { url: string; width?: number; height?: number; alt?: string } | "file" | null;
  type?: "website" | "article";
  /** Pages with nothing for searchers (sign-in, personal pages). */
  noindex?: boolean;
}): Metadata {
  const fullTitle = p.absoluteTitle ? p.title : `${p.title} | ${SITE_NAME}`;
  const description = clip(p.description);
  return {
    title: p.absoluteTitle ? { absolute: p.title } : p.title,
    description,
    alternates: { canonical: p.path },
    openGraph: {
      title: fullTitle,
      description,
      url: p.path,
      siteName: ASSOCIATION_NAME,
      locale: "en_BD",
      alternateLocale: ["bn_BD"],
      type: p.type ?? "website",
      ...(p.image === "file" ? {} : { images: [p.image ?? DEFAULT_SHARE_IMAGE] }),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
    ...(p.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const abs = (url: string) => (url.startsWith("http") ? url : `${siteOrigin()}${url}`);
const association = () => ({ "@id": `${siteOrigin()}/#association` });

/** The site itself, with its Bangla name, so search engines show the right site name. */
export function websiteJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: ASSOCIATION_NAME,
    alternateName: [ASSOCIATION_NAME_BN, SITE_NAME, "SSGHS Alumni"],
    url: origin,
    inLanguage: ["en", "bn"],
    publisher: association(),
  };
}

/** Breadcrumbs for a detail page: Home > section > page. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(t.path === "/" ? "" : t.path),
    })),
  };
}

export function newsArticleJsonLd(n: NewsItem) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: clip(n.title, 110),
    description: clip(n.excerpt, 300),
    image: [abs(n.featuredImage)],
    ...(n.publishedAt ? { datePublished: n.publishedAt } : {}),
    ...(n.updatedAt ? { dateModified: n.updatedAt } : {}),
    author: { "@type": "Person", name: n.author },
    publisher: { ...association(), "@type": "Organization", name: ASSOCIATION_NAME, logo: { "@type": "ImageObject", url: abs("/icon-512.png") } },
    mainEntityOfPage: abs(`/news/${n.id}`),
    articleSection: n.category,
  };
}

export function storyJsonLd(s: AlumniStoryItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: clip(s.title, 110),
    description: clip(s.summary, 300),
    image: [abs(s.coverImage)],
    ...(s.publishedAt ? { datePublished: s.publishedAt } : {}),
    ...(s.updatedAt ? { dateModified: s.updatedAt } : {}),
    author: { "@type": "Person", name: s.authorName, description: `SSC ${s.batchYear}${s.profession ? `, ${s.profession}` : ""}` },
    publisher: { ...association(), "@type": "Organization", name: ASSOCIATION_NAME, logo: { "@type": "ImageObject", url: abs("/icon-512.png") } },
    mainEntityOfPage: abs(`/stories/${s.id}`),
  };
}

const EMPLOYMENT: Record<string, string> = { "Full-time": "FULL_TIME", "Part-time": "PART_TIME", Contract: "CONTRACTOR", Internship: "INTERN" };

/** A job for Google's job search: who hires, where, until when. */
export function jobPostingJsonLd(j: JobListing) {
  const remote = j.workplaceType === "Remote";
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: [j.description, j.requirements.length ? `Requirements: ${j.requirements.join("; ")}` : "", j.benefits.length ? `Benefits: ${j.benefits.join("; ")}` : ""]
      .filter(Boolean)
      .join("\n\n"),
    ...(j.postedAt ? { datePosted: j.postedAt } : {}),
    // Open until the end of the deadline day in Dhaka.
    validThrough: `${j.deadline}T23:59:59+06:00`,
    employmentType: EMPLOYMENT[j.jobType] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: j.company },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.location, addressCountry: "BD" } },
    ...(remote ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Bangladesh" } } : {}),
    directApply: true,
    url: abs(`/careers/${j.id}`),
  };
}

/** The association, for search engines (JSON-LD), with the school it belongs to. */
export function organizationJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#association`,
    name: ASSOCIATION_NAME,
    alternateName: [ASSOCIATION_NAME_BN, "SSGHS Alumni Association"],
    url: origin,
    logo: `${origin}/icon-512.png`,
    email: schoolInfo.associationEmail,
    sameAs: [schoolInfo.facebookGroup],
    parentOrganization: {
      "@type": "HighSchool",
      name: schoolInfo.name,
      alternateName: [schoolInfo.bengaliName, "Sabuj Shikshayatan High School"],
      foundingDate: String(schoolInfo.established),
      url: schoolInfo.website,
      sameAs: [schoolInfo.facebookPage],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Hafiz Jute Mills, South Sonaichhari",
        addressLocality: "Sitakunda",
        addressRegion: "Chattogram",
        addressCountry: "BD",
      },
      identifier: { "@type": "PropertyValue", propertyID: "EIIN", value: schoolInfo.eiin },
    },
  };
}

/** Start of an event in Dhaka time, from its date and its "8:00 AM – 9:00 PM" style time. */
function eventStart(e: PublicEvent): string {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(e.time ?? "");
  if (!m) return e.date;
  const hour = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return `${e.date}T${String(hour).padStart(2, "0")}:${m[2]}:00+06:00`;
}

/** Search and share text for an event: date, place and price, the things people look for. */
export function eventDescription(e: PublicEvent): string {
  const date = new Date(`${e.date}T12:00:00+06:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });
  const place = [e.venue, e.locationCity].filter(Boolean).join(", ");
  const guests = e.guestTypes.filter((g) => g.price > 0).map((g) => `${g.name.toLowerCase()} ৳${g.price.toLocaleString("en-US")}`);
  const fee = { registrationFee: e.registrationFeeAmount, batchFees: e.batchFees, extraAdultFee: 0, childFee: 0, packages: [] };
  const price = e.registrationFeeAmount > 0 ? ` Member ${memberFeeLabel(fee)}${guests.length ? `, ${guests.join(", ")}` : ""}.` : "";
  return `${date}, ${place}.${price} Register online.`;
}

/** schema.org Event for one event page: date, place, price and organiser. */
export function eventJsonLd(e: PublicEvent) {
  const origin = siteOrigin();
  const url = `${origin}/events/${e.slug}`;
  const image = e.bannerImage.startsWith("http") ? e.bannerImage : `${origin}${e.bannerImage}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    description: clip(e.description, 500),
    startDate: eventStart(e),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.venue,
      address: { "@type": "PostalAddress", addressLocality: e.locationCity, addressCountry: "BD" },
    },
    image: [image],
    url,
    organizer: { ...association(), "@type": "Organization", name: ASSOCIATION_NAME, url: origin },
    offers: {
      "@type": "Offer",
      url,
      price: memberFeeRange({ registrationFee: e.registrationFeeAmount, batchFees: e.batchFees, extraAdultFee: 0, childFee: 0, packages: [] }).min,
      priceCurrency: "BDT",
      availability: e.closedReason === "FULL" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      ...(e.registrationDeadline ? { validThrough: e.registrationDeadline } : {}),
    },
  };
}
