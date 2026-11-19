/* Isolated shell only. Never cache sessions, JSON, user photos, HTML or writes. */
const VERSION = "community-static-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        cache.add(new URL("offline.html", self.registration.scope)),
      ),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("community-static-") && k !== VERSION)
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url),
    scope = new URL(self.registration.scope);
  if (
    req.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname) ||
    url.pathname.includes("/api/")
  )
    return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(new URL("offline.html", self.registration.scope)),
      ),
    );
    return;
  }
  if (
    /\/(?:assets\/.*\.(?:js|css|woff2?|webp|svg)|icon-(?:192|512)\.png)$/.test(
      url.pathname,
    )
  ) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      }),
    );
  }
});
