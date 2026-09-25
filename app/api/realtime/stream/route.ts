/**
 * SSGHS Alumni — Real-Time SSE Stream Endpoint
 * GET /api/realtime/stream
 * 
 * Client connects via EventSource to receive live updates.
 * Requires authentication (userId in query param or session).
 */

import { addConnection, removeConnection, SSE_EVENTS } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return new Response("Missing userId parameter", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register this connection
      const conn = addConnection(userId, controller);

      // Send initial connection confirmation
      const welcomePayload = `event: connected\ndata: ${JSON.stringify({
        userId,
        connectedAt: new Date().toISOString(),
        message: "SSGHS Alumni real-time connection established",
      })}\n\n`;
      controller.enqueue(encoder.encode(welcomePayload));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const ping = `event: ${SSE_EVENTS.HEARTBEAT}\ndata: ${JSON.stringify({
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(encoder.encode(ping));
          conn.lastPing = Date.now();
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval);
          removeConnection(userId, conn);
        }
      }, 30_000);

      // Handle client disconnect via AbortSignal
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        removeConnection(userId, conn);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
