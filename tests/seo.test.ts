import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbJsonLd, clip, ownImageOr, shareCard, eventDescription, eventJsonLd, jobPostingJsonLd, newsArticleJsonLd, organizationJsonLd, pageMetadata, SITE_NAME, websiteJsonLd } from "@/lib/seo";
import type { JobListing } from "@/lib/career-data";
import type { NewsItem } from "@/lib/data";
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

describe("more structured data", () => {
  it("names the website in both languages", () => {
    expect(websiteJsonLd().alternateName).toContain("প্রাক্তন সবুজিয়ান পরিষদ");
  });

  it("builds breadcrumbs from Home with absolute links", () => {
    const ld = breadcrumbJsonLd([{ name: "News", path: "/news" }, { name: "Jubilee update", path: "/news/abc" }]);
    expect(ld.itemListElement.map((i) => [i.position, i.name])).toEqual([[1, "Home"], [2, "News"], [3, "Jubilee update"]]);
    expect(ld.itemListElement[2].item).toMatch(/^https?:\/\/.+\/news\/abc$/);
  });

  it("dates a news article and names its publisher", () => {
    const n = { id: "abc", title: "Registration opens", category: "Events", excerpt: "x", content: "y", featuredImage: "/golden-jubilee-art.jpg", date: "12 Oct 2026", publishedAt: "2026-10-12T04:00:00.000Z", author: "Committee" } as NewsItem;
    expect(newsArticleJsonLd(n)).toMatchObject({ "@type": "NewsArticle", headline: "Registration opens", datePublished: "2026-10-12T04:00:00.000Z", author: { name: "Committee" }, articleSection: "Events" });
  });

  it("describes a job for job search, open to the end of its deadline day in Dhaka", () => {
    const j = {
      id: "j1", title: "Junior Accountant", company: "Example Traders", location: "Chattogram", workplaceType: "Remote", jobType: "Full-time",
      description: "Bookkeeping.", requirements: ["HSC"], benefits: [], deadline: "2026-11-30", postedAt: "2026-10-10T00:00:00.000Z",
    } as unknown as JobListing;
    expect(jobPostingJsonLd(j)).toMatchObject({
      "@type": "JobPosting",
      employmentType: "FULL_TIME",
      validThrough: "2026-11-30T23:59:59+06:00",
      datePosted: "2026-10-10T00:00:00.000Z",
      hiringOrganization: { name: "Example Traders" },
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { name: "Bangladesh" },
    });
    expect(jobPostingJsonLd(j).description).toContain("Requirements: HSC");
  });
});

describe("share cards", () => {
  it("uses the section card unless there is a real uploaded photo", () => {
    expect(ownImageOr("/api/media/content/abc/large.webp", "news")).toEqual({ url: "/api/media/content/abc/large.webp" });
    expect(ownImageOr("/golden-jubilee-art.jpg", "news")).toEqual(shareCard("news"));
    expect(ownImageOr(null, "stories")).toMatchObject({ url: "/og/stories.jpg", width: 1200, height: 630 });
  });

  it("leaves the image to the route's opengraph-image file when asked", () => {
    const og = pageMetadata({ path: "/batches/2014", title: "SSC batch 2014", description: "x", image: "file" }).openGraph as Record<string, unknown>;
    expect(og).not.toHaveProperty("images");
    expect(pageMetadata({ path: "/", title: "t", description: "d" }).openGraph).toMatchObject({ images: [shareCard("home")] });
  });
});
