/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'smartride-cache-v1';
const DYNAMIC_CACHE = 'smartride-dynamic-v1';
const API_CACHE = 'smartride-api-v1';

// Assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/bundle.js',
  '/manifest.json',
  '/logo.svg'
];

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API Requests (Network First, fallback to cache)
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') return; // Don't cache POST/PUT/DELETE
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2. Images (Cache First, then Network)
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedRes) => {
        return cachedRes || fetch(request).then((response) => {
          const resClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        });
      })
    );
    return;
  }

  // 3. Static Assets & Pages (Stale-While-Revalidate)
  event.respondWith(
    caches.match(request).then((cachedRes) => {
      const fetchPromise = fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          // If offline and requesting navigation, return offline.html
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });

      return cachedRes || fetchPromise;
    })
  );
});

// Push Notification Event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Smart Ride', options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-complaints') {
    // Logic to sync pending complaints from IndexedDB would go here
    console.log('[Service Worker] Syncing pending complaints...');
  }
});
