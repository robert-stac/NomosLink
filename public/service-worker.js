/* =================================================
   service-worker.js
   Place this file in your /public folder.
   It handles background push notifications for
   mobile phones and laptops even when the app
   is not open in the browser.
================================================= */

const CACHE_NAME = 'nomoslink-v1';

// Install event - cache essential files
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/* =================================================
   PUSH EVENT
   Fires when a push notification arrives from
   the server, even if the app is closed.
================================================= */
self.addEventListener('push', (event) => {
  let data = { title: 'NomoSLink', body: 'You have a new notification.', icon: '/icon.png', badge: '/badge.png' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    vibrate: [200, 100, 200], // vibration pattern for mobile
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'View', icon: '/icon.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false, // auto-dismiss after a few seconds
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* =================================================
   NOTIFICATION CLICK EVENT
   When the user taps the notification on their
   phone or clicks it on their laptop, open the app.
================================================= */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/* =================================================
   FETCH EVENT (optional offline support)
   Serves cached files when offline
================================================= */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  // Skip Supabase API calls - always fetch fresh
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});