import type { Metadata } from "next";
import { schoolInfo } from "@/lib/data";
import type { PublicEvent } from "@/lib/events/types";

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
export const DEFAULT_SHARE_IMAGE = { url: "/golden-jubilee-banner.jpg", width: 2752, height: 1536, alt: "Golden Jubilee 2026 of Sabuj Shikshayatan Government High School" };

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
  image?: { url: string; width?: number; height?: number; alt?: string } | null;
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
      images: [p.image ?? DEFAULT_SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
    ...(p.noindex ? { robots: { index: false, follow: true } } : {}),
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
    parentOrganization: {
      "@type": "HighSchool",
      name: schoolInfo.name,
      alternateName: [schoolInfo.bengaliName, "Sabuj Shikshayatan High School"],
      foundingDate: String(schoolInfo.established),
      url: schoolInfo.website,
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
  const price = e.registrationFeeAmount > 0 ? ` Member ৳${e.registrationFeeAmount.toLocaleString("en-US")}${guests.length ? `, ${guests.join(", ")}` : ""}.` : "";
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
    organizer: { "@type": "Organization", "@id": `${origin}/#association`, name: ASSOCIATION_NAME, url: origin },
    offers: {
      "@type": "Offer",
      url,
      price: e.registrationFeeAmount,
      priceCurrency: "BDT",
      availability: e.closedReason === "FULL" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      ...(e.registrationDeadline ? { validThrough: e.registrationDeadline } : {}),
    },
  };
}
