import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sabuj Shikshayatan Govt High School Alumni",
    short_name: "SSGHS Alumni",
    description:
      "Official alumni portal, digital smart card, and alumni directory for Sabuj Shikshayatan Government High School, Chattogram (EIIN 105070).",
    start_url: "/",
    display: "standalone",
    background_color: "#06281e",
    theme_color: "#064e3b",
    orientation: "portrait",
    categories: ["education", "social", "community"],
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Digital Smart Card",
        short_name: "Smart Card",
        description: "Display your digital alumni pass & Gate QR code",
        url: "/card",
        icons: [{ src: "/logo.png", sizes: "96x96" }],
      },
      {
        name: "Alumni Directory",
        short_name: "Directory",
        description: "Search classmates across batches 1985–2025",
        url: "/alumni",
        icons: [{ src: "/logo.png", sizes: "96x96" }],
      },
      {
        name: "Community Feed",
        short_name: "Feed",
        description: "Read updates and memoirs from alumni",
        url: "/feed",
        icons: [{ src: "/logo.png", sizes: "96x96" }],
      },
      {
        name: "Reunions & Events",
        short_name: "Events",
        description: "Check upcoming reunions and RSVPs",
        url: "/events",
        icons: [{ src: "/logo.png", sizes: "96x96" }],
      },
    ],
  };
}
