/**
 * StudyBridge service worker (vite-plugin-pwa injectManifest).
 *
 * - Precaches the app shell + static assets (hashed JS/CSS, HTML, icons, fonts).
 * - Serves fresh pages when online; falls back to cache when offline; shows
 *   offline.html when a page was never cached.
 * - NEVER caches auth or authenticated requests (any Authorization header and
 *   all /api/auth/*), and never routes mutations (POST/PUT/PATCH/DELETE) —
 *   Workbox routes here are GET-only, so non-GET requests always hit the network.
 * - Public GET endpoints (/api/universities, /api/scholarships, /api/countries,
 *   /api/faq) use NetworkFirst with a short cache lifetime when they come online.
 * - Caches images and Google Fonts (CacheFirst).
 * - Cleans up old precache versions automatically.
 * - Auto-updates on new deployments (skipWaiting + clientsClaim + autoUpdate).
 * - Push notification handlers are scaffolded (backend not implemented yet).
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim, skipWaiting } from 'workbox-core';

skipWaiting();
clientsClaim();

// Precache everything from the build manifest, clean up stale versions.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ---- API: auth & authenticated requests never touch the cache ----
// Defense in depth: anything carrying an Authorization header (JWT) plus every
// /api/auth/* call (login, register, logout) always goes to the network.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/auth/') || request.headers.has('Authorization'),
  new NetworkOnly({ cacheName: 'studybridge-api-auth' }),
);

// ---- Public GET endpoints: network-first, short cache lifetime ----
// Prepared for the public read-only endpoints (universities, scholarships,
// countries, FAQ). None are consumed by the frontend yet, but the route is
// ready: when they go live, GET responses are cached for 5 minutes for fast
// repeat visits while remaining fresh. Mutations can never hit this route
// (registerRoute defaults to GET-only), so they are never cached.
const PUBLIC_API_PATHS = [
  '/api/universities',
  '/api/scholarships',
  '/api/countries',
  '/api/faq',
];
registerRoute(
  ({ url }) => PUBLIC_API_PATHS.some((p) => url.pathname.startsWith(p)),
  new NetworkFirst({
    cacheName: 'studybridge-public-api',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 5 * 60 }),
    ],
  }),
);

// ---- Everything else under /api: never cache ----
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly({ cacheName: 'studybridge-api' }),
);

// ---- Images (Unsplash, uploads, etc.): cache-first with expiry ----
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'studybridge-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// ---- Google Fonts: cache-first (font URLs are immutable/versioned) ----
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'studybridge-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

// ---- Navigations: fresh when online, cached when offline, offline page as last resort ----
const navigationStrategy = new NetworkFirst({
  cacheName: 'studybridge-pages',
  networkTimeoutSeconds: 3,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
});

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event, request }) => {
    try {
      const response = await navigationStrategy.handle({ event, request });
      if (response) return response;
    } catch (_) {
      // Offline — fall through to cache / offline page.
    }

    const cached = await caches.match(request, { cacheName: 'studybridge-pages' });
    if (cached) return cached;

    const offline = await caches.match('/offline.html');
    if (offline) return offline;

    return Response.error();
  },
);

// ---- Messages / updates ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---- Push notifications (prepared; backend push server not implemented yet) ----
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'StudyBridge', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'StudyBridge';
  const options = {
    body: data.body || 'You have a new update from StudyBridge.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Placeholder close handler — lets the app/analytics know when a notification
// was dismissed. No-op until a notification backend exists.
self.addEventListener('notificationclose', (event) => {
  // Reserved: track dismissals / clear per-notification state here.
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(new URL(url, self.location.origin).pathname) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
