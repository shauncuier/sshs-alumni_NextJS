import { MetadataRoute } from "next";
import { sampleBatches, sampleStories } from "@/lib/data";
import { listPublicEvents } from "@/lib/events/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ssghs-alumni.edu.bd";
  const now = new Date();

  // Core static pages
  const staticPages = [
    "",
    "/about",
    "/achievements",
    "/school",
    "/alumni",
    "/batches",
    "/events",
    "/stories",
    "/gallery",
    "/donate",
    "/news",
    "/contact",
    "/login",
    "/register",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic Batch pages
  const batchPages = sampleBatches.map((b) => ({
    url: `${baseUrl}/batches/${b.year}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Dynamic Event pages
  const eventPages = (await listPublicEvents().catch(() => [])).map((e) => ({
    url: `${baseUrl}/events/${e.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic Story pages
  const storyPages = sampleStories.map((s) => ({
    url: `${baseUrl}/stories/${s.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...batchPages, ...eventPages, ...storyPages];
}
