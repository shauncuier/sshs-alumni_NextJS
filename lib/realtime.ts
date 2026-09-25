/**
 * SSGHS Alumni — Real-Time Event Emitter
 * 
 * Lightweight server-side event system for real-time updates.
 * Uses Server-Sent Events (SSE) as the transport layer.
 * 
 * This avoids the need for external services like Pusher/Socket.io
 * for the MVP while still providing live updates for:
 * - Direct Messages
 * - Notifications (new comments, verification, RSVP)
 * - Feed updates when batchmates post
 * 
 * Architecture:
 * - Server maintains a Map of userId → Set<ReadableStreamController>
 * - When an event happens (new message, notification), we push to all
 *   active SSE connections for that user
 * - Client connects via EventSource to /api/realtime/stream
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

interface UserConnection {
  controller: SSEController;
  connectedAt: number;
  lastPing: number;
}

// ── Global connection registry ────────────────────────────────────────
const globalForSSE = globalThis as unknown as {
  __sseConnections: Map<string, Set<UserConnection>>;
};

if (!globalForSSE.__sseConnections) {
  globalForSSE.__sseConnections = new Map();
}

const connections = globalForSSE.__sseConnections;

/**
 * Register a new SSE connection for a user
 */
export function addConnection(userId: string, controller: SSEController): UserConnection {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }

  const conn: UserConnection = {
    controller,
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };

  connections.get(userId)!.add(conn);
  console.log(`[SSE] User ${userId} connected. Active: ${connections.get(userId)!.size}`);

  return conn;
}

/**
 * Remove a connection when client disconnects
 */
export function removeConnection(userId: string, conn: UserConnection): void {
  const userConns = connections.get(userId);
  if (userConns) {
    userConns.delete(conn);
    if (userConns.size === 0) {
      connections.delete(userId);
    }
    console.log(`[SSE] User ${userId} disconnected. Remaining: ${userConns?.size || 0}`);
  }
}

/**
 * Send an event to a specific user across all their active connections
 */
export function sendToUser(userId: string, eventType: string, data: unknown): void {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return;

  const encoder = new TextEncoder();
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  const deadConnections: UserConnection[] = [];

  userConns.forEach((conn) => {
    try {
      conn.controller.enqueue(encoded);
      conn.lastPing = Date.now();
    } catch {
      // Connection is dead/closed
      deadConnections.push(conn);
    }
  });

  // Clean up dead connections
  deadConnections.forEach((conn) => removeConnection(userId, conn));
}

/**
 * Send an event to multiple users (e.g., all members of a batch)
 */
export function sendToUsers(userIds: string[], eventType: string, data: unknown): void {
  userIds.forEach((uid) => sendToUser(uid, eventType, data));
}

/**
 * Broadcast an event to ALL connected users (e.g., urgent announcement)
 */
export function broadcastAll(eventType: string, data: unknown): void {
  connections.forEach((_conns, userId) => {
    sendToUser(userId, eventType, data);
  });
}

/**
 * Get count of active connections
 */
export function getActiveConnectionCount(): number {
  let count = 0;
  connections.forEach((conns) => {
    count += conns.size;
  });
  return count;
}

/**
 * Check if a user is currently connected
 */
export function isUserOnline(userId: string): boolean {
  const userConns = connections.get(userId);
  return !!userConns && userConns.size > 0;
}

/**
 * Get all online user IDs
 */
export function getOnlineUserIds(): string[] {
  return Array.from(connections.keys());
}

// ── Event Type Constants ──────────────────────────────────────────────
export const SSE_EVENTS = {
  NEW_MESSAGE: "new_message",
  MESSAGE_READ: "message_read",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",
  NEW_NOTIFICATION: "new_notification",
  NOTIFICATION_READ: "notification_read",
  NEW_POST: "new_post",
  POST_LIKED: "post_liked",
  NEW_COMMENT: "new_comment",
  VERIFICATION_UPDATE: "verification_update",
  PAYMENT_UPDATE: "payment_update",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  ANNOUNCEMENT: "announcement",
  HEARTBEAT: "heartbeat",
} as const;
