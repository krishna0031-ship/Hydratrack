// HydraTrack AI — service worker
// Cache-first app shell so the app (and all its features) keep working
// with no internet connection, including after closing the browser or
// restarting the phone. Bump CACHE_NAME to force an update on next visit.

const CACHE_NAME = "hydratrack-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.jsx",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

// CDN assets the app needs (Tailwind, React, ReactDOM, Babel, fonts).
// Cached opportunistically on first successful fetch so a second offline
// launch doesn't need them again.
const RUNTIME_CACHE_HOSTS = [
  "unpkg.com",
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isRuntimeCdn = RUNTIME_CACHE_HOSTS.some((h) => url.hostname.includes(h));
  const isAppShell = url.origin === self.location.origin;

  if (!isAppShell && !isRuntimeCdn) return; // let anything unexpected pass through normally

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Update the cache in the background so the next offline launch has
        // the latest version, without blocking this response.
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
