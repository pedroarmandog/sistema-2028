/* ============================================================
   PetHub Mobile — Service Worker
   Escopo: /mobile/ (não interfere no sistema desktop)
   Estratégias:
     - Assets estáticos (CSS/JS/icons): Cache First
     - Chamadas de API (/api/*): Network First
     - Páginas HTML: Network First com fallback offline
   ============================================================ */

const CACHE_VERSION = "pethub-mobile-v6";
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_API = `${CACHE_VERSION}-api`;

// Assets para pré-cachear na instalação
const PRECACHE_ASSETS = [
  "/mobile/app.html",
  "/mobile/app.css",
  "/mobile/app.js",
  "/mobile/manifest.json",
  "/mobile/services/api.js",
  "/mobile/services/auth.js",
  "/mobile/services/push.js",
  "/mobile/components/toast.js",
  "/mobile/components/header.js",
  "/mobile/components/bottom-nav.js",
  "/mobile/pages/login.js",
  "/mobile/pages/dashboard.js",
  "/mobile/pages/agenda.js",
  "/mobile/pages/pets.js",
  "/mobile/pages/financeiro.js",
  "/mobile/pages/configuracoes.js",
  "/mobile/icons/launchericon-192x192.png",
  "/api-config.js",
];

// ─── INSTALL ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando v" + CACHE_VERSION);
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => {
        console.log("[SW] Pré-cacheando assets estáticos");
        // Usar addAll com individual requests para não falhar tudo se um asset falhar
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[SW] Falha ao cachear:", url, err.message);
            }),
          ),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Ativando v" + CACHE_VERSION);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("pethub-mobile-") &&
                name !== CACHE_STATIC &&
                name !== CACHE_API,
            )
            .map((name) => {
              console.log("[SW] Removendo cache antigo:", name);
              return caches.delete(name);
            }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// ─── FETCH ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET (POST/PUT/DELETE são sempre de rede)
  if (request.method !== "GET") return;

  // Ignorar extensões do browser e URLs de desenvolvimento
  if (url.protocol === "chrome-extension:" || url.protocol === "moz-extension:")
    return;

  // ── Chamadas de API → Network First (sem cache persistente)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(request, 5000));
    return;
  }

  // ── Assets estáticos do mobile → Cache First
  if (url.pathname.startsWith("/mobile/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Tudo mais → Network First
  event.respondWith(networkFirst(request));
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────
self.addEventListener("push", (event) => {
  console.log("[SW] 📬 Evento PUSH recebido!");
  console.log("[SW]    event.data:", event.data);
  console.log("[SW]    event.data.text():", event.data?.text());
  
  if (!event.data) {
    console.log("[SW] ⚠️ Evento push sem dados - ignorando");
    return;
  }

  let payload;
  try {
    payload = event.data.json();
    console.log("[SW] ✅ Payload JSON:", payload);
  } catch (e) {
    console.log("[SW] ⚠️ Payload não é JSON, usando texto");
    payload = {
      title: "PetHub",
      body: event.data.text(),
      icon: "/mobile/icons/launchericon-192x192.png",
    };
  }

  const title = payload.title || "PetHub";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/mobile/icons/launchericon-192x192.png",
    badge: "/mobile/icons/launchericon-72x72.png",
    tag: payload.tag || "pethub-default",
    data: payload.data || {},
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
    silent: false,
    renotify: true,
    requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : true,
  };

  console.log("[SW] 📢 Exibindo notificação:", title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log("[SW] ✅ Notificação exibida com sucesso");
      })
      .catch((err) => {
        console.error("[SW] ❌ Erro ao exibir notificação:", err);
      })
  );
});

// ─── NOTIFICATION CLICK ───────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] 🖱️  Notificação clicada:", event.notification);
  
  event.notification.close();

  const data = event.notification.data || {};
  const targetPage = data.page || "dashboard";
  const targetUrl = `/mobile/app.html?page=${targetPage}`;

  console.log("[SW]    Navegando para:", targetUrl);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se já existe uma aba do app aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes("/mobile/") && "focus" in client) {
            console.log("[SW] ✅ Focando em aba existente");
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Caso contrário, abrir nova aba
        if (clients.openWindow) {
          console.log("[SW] ✅ Abrindo nova aba");
          return clients.openWindow(targetUrl);
        }
      })
      .catch((err) => {
        console.error("[SW] ❌ Erro ao abrir notificação:", err);
      })
  );
});

// ─── PUSH SUBSCRIPTION CHANGE ─────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSub) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newSub.toJSON()),
        });
      }),
  );
});

// ─── HELPERS ──────────────────────────────────────────────

/** Cache First: usa cache, só vai para a rede se não encontrar */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return offlineFallback(request);
  }
}

/** Network First: vai para a rede, usa cache como fallback */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/** Network First com timeout: tenta rede por N ms, senão usa cache */
async function networkFirstWithTimeout(request, timeoutMs) {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: timeoutController.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ erro: "Sem conexão", offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/** Fallback offline para páginas HTML */
async function offlineFallback(request) {
  if (request.headers.get("Accept")?.includes("text/html")) {
    const cached = await caches.match("/mobile/app.html");
    if (cached) return cached;
  }
  return new Response("Offline", { status: 503 });
}