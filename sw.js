const VERSION = 3;
const CACHE_NAME = `pintona-v${VERSION}`;

// Assets that must be available offline from the first load
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/i18n.js',
  '/firebase.js',
  '/firebase-config.js',
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of existing clients without a reload
  self.clients.claim();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

// Transparent 1×1 SVG used as a fallback for failed image requests
function offlineImageResponse() {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    { headers: { 'Content-Type': 'image/svg+xml' } }
  );
}

// Network-first: try the network, cache a fresh copy, fall back to cache
function networkFirst(request) {
  return fetch(request)
    .then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/offline.html');
        if (request.destination === 'image') return offlineImageResponse();
      })
    );
}

// Stale-while-revalidate: serve from cache immediately, refresh in background
function staleWhileRevalidate(request) {
  return caches.match(request).then(cached => {
    const fetchPromise = fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        if (request.destination === 'image') return offlineImageResponse();
      });
    return cached || fetchPromise;
  });
}

// Cache-first: serve from cache, otherwise fetch and fill the cache
function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        if (request.destination === 'image') return offlineImageResponse();
      });
  });
}

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Network-only: /api/ routes, with an offline JSON error fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'You are offline. Connect to use AI features.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Network-first: navigations and same-origin .js/.html requests
  const isJsOrHtml = isSameOrigin && /\.(js|html)$/.test(url.pathname);
  if (request.mode === 'navigate' || isJsOrHtml) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Stale-while-revalidate: Google Fonts and Firebase Storage images
  const isGoogleFonts =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isFirebaseStorageImage =
    url.hostname === 'firebasestorage.googleapis.com' && request.destination === 'image';
  if (isGoogleFonts || isFirebaseStorageImage) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cache-first: everything else same-origin
  if (isSameOrigin) {
    event.respondWith(cacheFirst(request));
    return;
  }
});
