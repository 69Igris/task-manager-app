// Simple Service Worker for PWA
const CACHE_NAME = 'taskmanager-v1';
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Next.js internal requests and HMR
  if (event.request.url.includes('/_next/') || 
      event.request.url.includes('/webpack-hmr') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  // API requests - network only
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Other requests - network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
