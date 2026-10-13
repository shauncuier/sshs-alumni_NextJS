import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JsonLd from "@/components/shared/JsonLd";
import { clip, eventDescription, eventJsonLd, organizationJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import type { PublicEvent } from "@/lib/events/types";

const jubilee = {
  slug: "golden-jubilee",
  title: "Golden Jubilee: 50 Years of Sabuj Shikshayatan",
  description: "Sabuj Shikshayatan Government High School turns 50.",
  date: "2026-12-26",
  time: "8:00 AM – 9:00 PM",
  venue: "School campus, Sitakunda",
  locationCity: "Chattogram",
  bannerImage: "/golden-jubilee-art.jpg",
  registrationFeeAmount: 1500,
  guestTypes: [
    { name: "Spouse", price: 700, max: 1 },
    { name: "Child", price: 500, max: 5 },
  ],
  isMembershipEvent: true,
  closedReason: null,
  registrationDeadline: "2026-12-15T17:59:59.000Z",
} as unknown as PublicEvent;

describe("page metadata", () => {
  it("gives every page a canonical URL, a suffixed title and full share tags", () => {
    const m = pageMetadata({ path: "/news", title: "News and notices", description: "News from the association." });
    expect(m.title).toBe("News and notices");
    expect(m.alternates).toEqual({ canonical: "/news" });
    expect(m.openGraph).toMatchObject({ title: `News and notices | ${SITE_NAME}`, url: "/news", siteName: expect.any(String) });
    expect(m.robots).toBeUndefined();
  });

  it("keeps sign-in and personal pages out of search results", () => {
    expect(pageMetadata({ path: "/login", title: "Sign in", description: "x", noindex: true }).robots).toEqual({ index: false, follow: true });
  });

  it("trims long descriptions on a word boundary", () => {
    const long = "word ".repeat(60);
    const out = clip(long);
    expect(out.length).toBeLessThanOrEqual(158);
    expect(out.endsWith("…")).toBe(true);
    expect(clip("short text")).toBe("short text");
  });
});

describe("structured data", () => {
  it("describes an event with its Dhaka start time, place and price", () => {
    const ld = eventJsonLd(jubilee);
    expect(ld).toMatchObject({
      "@type": "Event",
      startDate: "2026-12-26T08:00:00+06:00",
      location: { name: "School campus, Sitakunda", address: { addressLocality: "Chattogram", addressCountry: "BD" } },
      offers: { price: 1500, priceCurrency: "BDT", availability: "https://schema.org/InStock", validThrough: "2026-12-15T17:59:59.000Z" },
    });
    expect(ld.image[0]).toMatch(/^https?:\/\/.+\/golden-jubilee-art\.jpg$/);
  });

  it("writes the date, place and every guest price into the event description", () => {
    expect(eventDescription(jubilee)).toBe("Saturday, 26 December 2026, School campus, Sitakunda, Chattogram. Member ৳1,500, spouse ৳700, child ৳500. Register online.");
  });

  it("names the association and its school, both names and the EIIN", () => {
    const ld = organizationJsonLd();
    expect(ld.parentOrganization.alternateName).toContain("Sabuj Shikshayatan High School");
    expect(ld.parentOrganization.identifier).toMatchObject({ propertyID: "EIIN", value: "105070" });
  });

  it("can never be closed early by text from the database", () => {
    const html = renderToStaticMarkup(JsonLd({ data: { name: "</script><script>alert(1)</script>" } }));
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });
});
