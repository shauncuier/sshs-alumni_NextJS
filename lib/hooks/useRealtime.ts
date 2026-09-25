/**
 * SSGHS Alumni — React Hook for Real-Time SSE Events
 * 
 * Usage in any client component:
 * 
 *   const { isConnected, lastMessage, notifications } = useRealtime(userId);
 * 
 * Automatically connects to SSE stream and dispatches events.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface RealtimeMessage {
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  createdAt: string;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  lastMessage: RealtimeMessage | null;
  lastNotification: RealtimeNotification | null;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  clearMessageAlert: () => void;
  clearNotificationAlert: () => void;
}

export function useRealtime(userId: string | undefined | null): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);
  const [lastNotification, setLastNotification] = useState<RealtimeNotification | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!userId || typeof window === "undefined") return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const appUrl = window.location.origin;
    const es = new EventSource(`${appUrl}/api/realtime/stream?userId=${userId}`);

    es.addEventListener("connected", () => {
      setIsConnected(true);
      console.log("[SSGHS Realtime] Connected");
    });

    es.addEventListener("new_message", (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeMessage;
        setLastMessage(data);
        setUnreadMessageCount((prev) => prev + 1);
      } catch {
        console.warn("[SSGHS Realtime] Invalid message payload");
      }
    });

    es.addEventListener("new_notification", (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeNotification;
        setLastNotification(data);
        setUnreadNotificationCount((prev) => prev + 1);
      } catch {
        console.warn("[SSGHS Realtime] Invalid notification payload");
      }
    });

    es.addEventListener("message_read", () => {
      // Someone read our message — could update UI indicators
    });

    es.addEventListener("payment_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[SSGHS Realtime] Payment update:", data);
      } catch {
        // non-critical
      }
    });

    es.addEventListener("heartbeat", () => {
      // Keep-alive, no action needed
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();

      // Reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[SSGHS Realtime] Reconnecting...");
        connect();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, [userId]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const clearMessageAlert = useCallback(() => {
    setUnreadMessageCount(0);
    setLastMessage(null);
  }, []);

  const clearNotificationAlert = useCallback(() => {
    setUnreadNotificationCount(0);
    setLastNotification(null);
  }, []);

  return {
    isConnected,
    lastMessage,
    lastNotification,
    unreadMessageCount,
    unreadNotificationCount,
    clearMessageAlert,
    clearNotificationAlert,
  };
}
