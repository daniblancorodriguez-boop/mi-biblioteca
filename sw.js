// Service worker: permite usar la app sin conexión.
// Estrategia: primero Internet (así siempre ves la última versión) y, si no hay conexión, la copia guardada.
// Las llamadas a APIs externas (Open Library, Apple Books, Google Books) NO se interceptan.
const CACHE = 'mi-biblioteca-v10';
const SHELL = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' evita guardar una copia vieja que el navegador tuviera en su caché HTTP
      .then(c => Promise.all(SHELL.map(u =>
        fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return c.put(u, r); })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 5000); // red muy lenta: usar la copia guardada
      fetch(e.request, { cache: 'no-cache' }).then(r => { clearTimeout(timer); resolve(r); }, err => { clearTimeout(timer); reject(err); });
    }).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() =>
      caches.match(e.request).then(hit => hit || caches.match('./index.html'))
    )
  );
});
