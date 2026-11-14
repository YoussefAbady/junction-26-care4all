const CACHE = "care4all-public-v2";
const OFFLINE = "/offline.html";
const PUBLIC = new Set([OFFLINE, "/care-192.png", "/care-512.png", "/care-maskable.png", "/care-apple.png", "/care-hero.webp"]);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...PUBLIC])));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("care4all-public-") && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.search && PUBLIC.has(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  } else if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(CACHE)).match(OFFLINE)));
  }
});
