/// TidyTab Service Worker
/// Network-first for HTML/navigation, cache-first for static assets.

const CACHE_NAME = 'tidytab-v1';

// Static asset extensions worth caching
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico|avif)$/i;

// Paths that must NEVER be served from cache
const NETWORK_ONLY_PATHS = ['/api/', '/dashboard', '/b/', '/g/'];

// ── Install ────────────────────────────────────────────────────────
self.addEventListener('install', () => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) → network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Dynamic / API paths → always network (never cache)
  if (NETWORK_ONLY_PATHS.some((p) => url.pathname.startsWith(p))) {
    return; // Let browser handle normally
  }

  // Static assets → cache-first
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (data fetches, etc.) → network, no cache
});

// ── Strategies ─────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Don't cache error responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback — serve from cache if available
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
