const CACHE_NAME = 'studybridge-v4';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never serve Vite's dev modules from the cache; otherwise code changes
  // (and HMR) stay hidden behind an old cached copy after a reload.
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin === self.location.origin &&
    /^\/(src|@vite|@react-refresh|node_modules\/\.vite)\//.test(requestUrl.pathname)
  ) {
    return;
  }

  // Handle SPA HTML page navigation (e.g. refreshing /chatbot, /universities, /profile)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If server returns 404 on page reload, fallback to cached index.html so React Router takes over
          if (!response || response.status === 404) {
            return caches.match('/index.html').then((cached) => cached || caches.match('/') || response);
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/offline.html'))),
    );
    return;
  }

  // Handle static assets & requests
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin) && !event.request.url.includes('/api/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
