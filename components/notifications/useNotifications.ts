"use client";

import { useCallback, useEffect, useState } from "react";

export interface MemberNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

/** The signed-in member's notifications from /api/notifications. */
export function useNotifications(enabled = true) {
  const [items, setItems] = useState<MemberNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setItems(data.notifications ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [enabled, refresh]);

  const markRead = useCallback(async (ids?: string[]) => {
    setItems((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, isRead: true } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { notificationIds: ids } : {}),
    }).catch(() => {});
  }, []);

  return { items, loaded, error, unread: items.filter((n) => !n.isRead).length, refresh, markRead };
}
