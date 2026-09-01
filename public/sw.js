// Service worker de VALU Finance AI: guarda en caché la interfaz de la app
// (HTML, bundle de JS, íconos) para que se pueda abrir y seguir usando sin
// conexión a internet. Los datos financieros del usuario NO viven aquí —
// esos ya se guardan localmente con AsyncStorage/Zustand y se sincronizan
// con Supabase cuando hay conexión (arquitectura offline-first, spec 32).
// Subir este número cada vez que cambien el manifest o los íconos —
// "activate" borra cualquier caché con un nombre distinto, así que un
// número nuevo obliga a todos a bajar la versión fresca en vez de quedar
// atorados con un manifest/ícono viejo cacheado (spec: auditoría de "no
// funcionó la función de integrarlo a la pantalla" en Android — un
// manifest o ícono viejo en caché puede tumbar la instalación).
const CACHE_NAME = 'valu-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

// El manifest y los íconos son justo lo que Android revisa para decidir
// si la app se puede "instalar" — nunca deben servirse desde una caché
// vieja mientras haya internet, aunque el resto de archivos estáticos sí
// puedan (esos ya cambian de nombre en cada build).
function isInstallCritical(url) {
  return url.pathname === '/manifest.json' || url.pathname.startsWith('/icons/');
}

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

  // Manifest e íconos: red primero, igual que la navegación — nunca se
  // sirve una versión vieja en caché mientras haya internet.
  if (isInstallCritical(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Resto de archivos estáticos (JS): responde de la caché al instante si
  // ya existe, y de todos modos actualiza la caché en segundo plano para
  // la próxima vez — estos ya cambian de nombre en cada build, así que no
  // hay riesgo de quedarse con una versión vieja.
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
