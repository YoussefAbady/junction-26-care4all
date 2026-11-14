/*
 * care4all service worker. The build fills in the cache version and the precache list (scripts/render-sw.js).
 *
 * It stores the public app shell and its static files so the app opens offline, and one response from the API: the
 * public educational content, GET /api/content, so it does not have to be downloaded again. That response is the same
 * for everyone and holds no personal data. Every other /api/ request, and every request that is not a GET, goes
 * straight to the network. Account, profile, notes, reminders, chat and library responses are never written to a
 * cache, so no health data is ever stored.
 */
const VERSION = "__VERSION__";
const CACHE = "care4all-shell-" + VERSION;
const CONTENT_CACHE = "care4all-content-" + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});

// A new version starts with new caches. The shell and content caches of earlier versions are deleted here.
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (/^care4all-(shell|content)-/.test(key) && key !== CACHE && key !== CONTENT_CACHE) await caches.delete(key);
    }
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
  if (url.origin !== self.location.origin) return;
  // Exactly /api/content, with any query. Not /api/content-reports, not /api/content/anything, nothing else under /api/.
  if (url.pathname === "/api/content") event.respondWith(content(event));
  else if (!url.pathname.startsWith("/api/")) event.respondWith(request.mode === "navigate" ? openApp(request) : fromCache(request));
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

// Stale while revalidate: the copy on hand answers at once, and a fresh one is fetched and kept for next time. With
// nothing on hand yet the network answers, and offline that is an ordinary network failure.
function content(event) {
  const refresh = refreshContent(event.request);
  event.waitUntil(refresh.catch(() => {}));
  return caches.open(CONTENT_CACHE).then(cache => cache.match(event.request, FROM_CACHE)).then(cached => cached || refresh);
}

async function refreshContent(request) {
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    await caches.open(CONTENT_CACHE).then(cache => cache.put(request, copy)).catch(() => {});   // failing to keep it must not fail the page
  }
  return response;
}
