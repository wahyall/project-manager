const CACHE_VERSION = "v1";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = ["/", "/manifest.json"];

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== "GET") {
    return;
  }

  // Skip non-http/https requests for caching (fixes chrome-extension error)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // API Requests: Network First, fallback to Cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Static Assets: Cache First, fallback to Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((response) => {
          const resClone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(request, resClone));
          return response;
        })
      );
    }),
  );
});

// Push Notification Event
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.url,
      vibrate: [100, 50, 100],
    };
    event.waitUntil(
      self.registration.showNotification(
        data.title || "Notifikasi Baru",
        options,
      ),
    );
  } catch (err) {
    console.error("Push Error", err);
  }
});

// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});
