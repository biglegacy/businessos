const CACHE_NAME = 'businessos-cache-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Perform service worker installation and pre-cache key static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = ASSETS_TO_CACHE.map((url) => {
        return cache.add(url).catch((err) => {
          console.warn(`Service Worker: Soft skipped caching asset ${url}:`, err);
        });
      });
      return Promise.all(cachePromises);
    })
  );
  self.skipWaiting();
});

// Activate service worker, clear old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listen for skip waiting messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Intercept fetch requests and apply strategic caching rules
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Exclude API calls and Firebase backend queries from service worker interception
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.hostname.includes('firestore.googleapis.com') ||
    requestUrl.hostname.includes('identitytoolkit.googleapis.com') ||
    requestUrl.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation requests (HTML routes / client-side routing) -> Network-First, fallback to cached index shell
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Robust offline fallback for iOS Safari and Chromium
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BusinessOS Offline</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:2rem;text-align:center;background:#064E3B;color:white;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}h2{margin-bottom:0.5rem}p{opacity:0.8;font-size:0.9rem}</style></head><body><h2>BusinessOS Offline</h2><p>You are currently offline. Please connect to the internet to load BusinessOS.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Static assets & third-party CDNs -> Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
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
          if (cachedResponse) return cachedResponse;
          return new Response('', { status: 408, statusText: 'Request offline' });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
