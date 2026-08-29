// Service worker de VALU Finance AI: guarda en caché la interfaz de la app
// (HTML, bundle de JS, íconos) para que se pueda abrir y seguir usando sin
// conexión a internet. Los datos financieros del usuario NO viven aquí —
// esos ya se guardan localmente con AsyncStorage/Zustand y se sincronizan
// con Supabase cuando hay conexión (arquitectura offline-first, spec 32).
const CACHE_NAME = 'valu-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación (abrir la app o refrescar): red primero para tener siempre
  // la última versión cuando hay conexión, y cae al shell guardado en
  // caché cuando no la hay — así cualquier ruta abre la app sin internet.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match(request)))
    );
    return;
  }

  // Resto de archivos estáticos (JS, íconos, manifest): responde de la
  // caché al instante si ya existe, y de todos modos actualiza la caché en
  // segundo plano para la próxima vez.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
