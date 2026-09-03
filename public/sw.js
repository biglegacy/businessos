const CACHE_NAME = 'businessos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/index.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://img.icons8.com/color/192/company.png',
  'https://img.icons8.com/color/512/company.png'
];

// Perform service worker installation and pre-cache key static assets individually to tolerate missing files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = ASSETS_TO_CACHE.map((url) => {
        return cache.add(url).catch((err) => {
          console.warn(`Service Worker: soft skipped caching non-critical or environment-specific url: ${url}`, err);
        });
      });
      return Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept fetch requests and apply strategic caching rules
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // 1. Navigation requests (HTML routes / client-side routing) -> Network-First, fallback to cached index shell
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: load the main cached single-page application shell
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Static assets & third-party CDNs -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const isSameOrigin = requestUrl.origin === self.location.origin;
            const isCDN = requestUrl.hostname.includes('fonts.googleapis.com') ||
                          requestUrl.hostname.includes('fonts.gstatic.com') ||
                          requestUrl.hostname.includes('icons8.com');

            if (isSameOrigin || isCDN) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('Service Worker: Network fetch failed for resource:', event.request.url, err);
          // If network fails and there is no cached fallback, throw error to let resource handle it or return undefined
          if (cachedResponse) return cachedResponse;
          throw err;
        });

      // Instantly serve from cache if available, but keep fetching in background to update cache (Stale-While-Revalidate)
      return cachedResponse || fetchPromise;
    })
  );
});

