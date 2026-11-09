"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KEY_PAGES } from "@/lib/key-pages";

/**
 * WebMCP (https://webmachinelearning.github.io/webmcp/): tools that an AI agent in the
 * visitor's browser can call on this site. They read only public information (the
 * site summary and the event list) or open a public page. Browsers without
 * navigator.modelContext skip all of it.
 */

type ToolResult = { content: { type: "text"; text: string }[] };
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
};
type ModelContext = { registerTool: (tool: Tool) => unknown; unregisterTool?: (name: string) => void };

const text = (t: string): ToolResult => ({ content: [{ type: "text", text: t }] });

type EventSummary = { title: string; slug: string; date: string; time?: string; venue: string; locationCity: string; registrationOpen?: boolean };

export default function WebMcpTools() {
  const router = useRouter();

  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc?.registerTool) return;

    const tools: Tool[] = [
      {
        name: "get_site_overview",
        description:
          "Summary of প্রাক্তন সবুজিয়ান পরিষদ, the alumni association of Sabuj Shikshayatan Government High School (Sitakunda, Bangladesh): contact details, upcoming events and the main pages, in Markdown.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => text(await (await fetch("/llms.txt")).text()),
      },
      {
        name: "list_upcoming_events",
        description: "The association's upcoming reunions and programmes, with date, time, venue and the page to register on.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => {
          const res = await fetch("/api/events");
          if (!res.ok) return text("The event list could not be loaded. Try again later.");
          const { events } = (await res.json()) as { events: EventSummary[] };
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = events.filter((e) => e.date >= today);
          if (upcoming.length === 0) return text("No upcoming events are announced yet.");
          return text(
            upcoming
              .map((e) => `${e.date}${e.time ? ` ${e.time}` : ""}: ${e.title}, ${[e.venue, e.locationCity].filter(Boolean).join(", ")}. ${location.origin}/events/${e.slug}`)
              .join("\n"),
          );
        },
      },
      {
        name: "open_page",
        description: "Open one of the site's main public pages in this tab.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              enum: ["/", ...KEY_PAGES.map((p) => p.path)],
              description: KEY_PAGES.map((p) => `${p.path}: ${p.about}`).join("; "),
            },
          },
          required: ["path"],
        },
        execute: async (input) => {
          const path = String(input.path ?? "");
          if (path !== "/" && !KEY_PAGES.some((p) => p.path === path)) return text(`Unknown page: ${path}`);
          router.push(path);
          return text(`Opened ${location.origin}${path}`);
        },
      },
    ];

    const registered: string[] = [];
    for (const tool of tools) {
      try {
        mc.registerTool(tool);
        registered.push(tool.name);
      } catch {
        // Already registered by an earlier render, or the browser rejected it.
      }
    }
    return () => {
      for (const name of registered) {
        try {
          mc.unregisterTool?.(name);
        } catch {}
      }
    };
  }, [router]);

  return null;
}
