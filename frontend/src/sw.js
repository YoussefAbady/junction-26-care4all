/*
 * care4all service worker. The build fills in the cache version and the precache list (scripts/render-sw.js).
 *
 * It stores the public app shell and its static files so the app opens offline. It never stores anything
 * from /api/. Account, profile, notes, reminders, chat and library responses go straight to the network,
 * so no health data is ever written to a cache.
 */
const VERSION = "__VERSION__";
const CACHE = "care4all-shell-" + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("care4all-shell-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The page asks for the update once the person agrees to reload. A waiting worker never interrupts open tabs.
self.addEventListener("message", event => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(request.mode === "navigate" ? openApp(request) : fromCache(request));
});

// Precached files are addressed by URL and their names carry a content hash, so a Vary header on the response (some
// servers add Vary: Origin or Accept-Encoding) must never make a cached copy look like a miss.
const FROM_CACHE = { ignoreVary: true };

// Online: always the freshest shell. Offline: the cached shell, which explains what needs a connection.
async function openApp(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match("/", FROM_CACHE)) || Response.error();
  }
}

async function fromCache(request) {
  return (await caches.match(request, FROM_CACHE)) || fetch(request);
}
