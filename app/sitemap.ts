import { MetadataRoute } from "next";
import { listBatches } from "@/lib/batches";
import { publishedStoryIds } from "@/lib/stories";
import { listPublicEvents } from "@/lib/events/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
  // Only batches with verified members: empty years have nothing to show.
  const years = (await listBatches().catch(() => [])).filter((b) => b.totalAlumni > 0).map((b) => b.year);
  const batchPages = years.map((year) => ({
    url: `${baseUrl}/batches/${year}`,
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
  const storyPages = (await publishedStoryIds().catch(() => [])).map((s) => ({
    url: `${baseUrl}/stories/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...batchPages, ...eventPages, ...storyPages];
}
