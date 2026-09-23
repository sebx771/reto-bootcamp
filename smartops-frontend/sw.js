// SmartOps SuperBrix - Service Worker v1.1.0
// Proporciona soporte offline completo para el App Shell industrial

const CACHE_NAME = 'smartops-shell-v1.1.0';

// Recursos locales estáticos esenciales para el arranque offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/storage.js',
  './js/api.js',
  './js/state.js',
  './js/scanner.js',
  './js/ui.js',
  './js/ui/timer.js',
  './js/ui/toasts.js',
  './js/ui/modals.js',
  './js/app.js'
];

// Instalación: Cachea el cascarón de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-cacheando App Shell de SmartOps...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activación: Limpieza de versiones obsoletas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Eliminando caché obsoleta:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Estrategia de Fetch: Cache-First para recursos locales con respaldo de red
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET (como envíos POST a la API)
  if (event.request.method !== 'GET') {
    return;
  }

  // Responder desde caché primero, luego fallback a red
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, intentar red
      return fetch(event.request).then((networkResponse) => {
        // Cachear dinámicamente si es un recurso de CDN (Tailwind, Lucide, fonts)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes('cdn') ||
           event.request.url.includes('fonts') ||
           event.request.url.includes('unpkg'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si no hay red y la petición es para una página HTML, devolver index.html
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
