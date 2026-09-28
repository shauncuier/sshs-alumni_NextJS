/**
 * SSGHS Alumni Association — Progressive Web App Service Worker
 * Version: 1.0.0
 * 
 * Supports:
 * 1. Offline cache for batch directories and campus visits
 * 2. Stale-while-revalidate for static brand assets & alumni photos
 * 3. Web Push notifications for urgent school & reunion notices
 */

// Bump on caching changes: activate deletes every cache with another name.
const CACHE_NAME = "ssghs-alumni-v4";
// Shown for pages that are not cached when there is no connection. A static file,
// not a Next.js page: a Next.js page served under another URL fails to hydrate.
const OFFLINE_FALLBACK_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK_URL,
  "/",
  "/logo.png",
  "/manifest.webmanifest",
  "/card",
  "/alumni",
  "/events",
  "/favicon.ico",
];

// Install: Cache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[PWA SW] Pre-caching core alumni shell");
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[PWA SW] Some precache assets failed, proceeding", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[PWA SW] Removing old cache", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategy based on request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension schemes
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Never intercept API calls: they must always reach the server, and a cached
  // HTML page must never be returned where the app expects JSON.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Cache-first for images, fonts, and static assets
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|ico)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Pages: network-first, so online visitors always get the current version.
  // The directory, card and batch pages are also cached for offline use.
  const offlinePage =
    url.pathname === "/" ||
    url.pathname.startsWith("/card") ||
    url.pathname.startsWith("/alumni") ||
    url.pathname.startsWith("/batches");
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (offlinePage && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || (event.request.mode === "navigate" ? caches.match(OFFLINE_FALLBACK_URL) : Response.error())
        )
      )
  );
});

// Push Notifications
self.addEventListener("push", (event) => {
  let data = {
    title: "SSGHS Alumni Association",
    body: "New reunion announcement from Sabuj Shikshayatan High School.",
    url: "/events",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/events",
    },
    actions: [
      { action: "open", title: "View Notice" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click: Navigate to notification destination
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
