/* TravelGuide offline shell + catalog cache */
const CACHE = "travelguide-v3";
const PRECACHE = ["/", "/index.html", "/travelguide-logo.svg", "/manifest.webmanifest"];
const API_CACHE = "travelguide-api-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cache-friendly catalog/FAQ for offline browse
  if (
    url.pathname === "/api/attractions" ||
    url.pathname === "/api/catalog/facets" ||
    url.pathname.startsWith("/api/knowledge")
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(API_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.open(API_CACHE).then((c) => c.match(req)).then((r) => r || new Response(JSON.stringify({ offline: true, data: [] }), { headers: { "Content-Type": "application/json" } }))),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  const isAppShell =
    req.mode === "navigate" ||
    url.pathname === "/index.html" ||
    /\.(?:js|css)$/.test(url.pathname);

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached || caches.match("/"));
      return cached || fetched;
    }),
  );
});
