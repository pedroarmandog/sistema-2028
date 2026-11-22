'use strict';
const CACHE = 'pethub-cliente-static-v8-dados-tutor';
const STATIC = ['/cliente-app/app.html', '/cliente-app/app.css', '/cliente-app/premium.css', '/cliente-app/visual.js', '/cliente-app/api.js', '/cliente-app/tema.js', '/cliente-app/app.js', '/cliente-app/assets/icon-192.png', '/cliente-app/assets/icon-512.png', '/cliente-app/assets/boas-vindas.webp'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pethub-cliente-static-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', event => { if (event.data === 'ATUALIZAR')
    self.skipWaiting(); });
self.addEventListener('fetch', event => {
    const u = new URL(event.request.url);
    if (event.request.method !== 'GET' || u.origin !== self.location.origin)
        return;
    // Nem APIs, nem fotos privadas, nem respostas autenticadas são armazenadas.
    const key = u.pathname;
    if (!STATIC.includes(key))
        return;
    event.respondWith(fetch(event.request).then(r => { if (r.ok) {
        const c = r.clone();
        void caches.open(CACHE).then(cache => cache.put(key, c));
    } return r; }).catch(() => caches.match(key)));
});
self.addEventListener('push', event => { let p = {}; try {
    p = event.data.json();
}
catch { } event.waitUntil(self.registration.showNotification('PetHub Cliente', { body: p.body || 'Há uma atualização no aplicativo.', icon: '/cliente-app/assets/icon-192.png', badge: '/cliente-app/assets/icon-192.png', tag: p.tag || 'cliente-aviso', data: { url: '/cliente-app/app.html' } })); });
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(w => { const c = w.find(c => new URL(c.url).pathname.startsWith('/cliente-app/')); if (c) {
    c.postMessage('ATUALIZAR_DADOS');
    return c.focus();
} return self.clients.openWindow('/cliente-app/app.html'); })); });
