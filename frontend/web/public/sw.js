/**
 * Lumina Life OS — Service Worker
 * Handles: offline fallback, push notifications, notification clicks
 */

const CACHE_NAME = 'lumina-v1';
const PRECACHE   = ['/', '/index.html'];

// ── Install: precache shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: take control of all clients ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Remove old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      self.clients.claim(),
    ])
  );
});

// ── Fetch: navigate → always try network, fallback to shell ─────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((r) => r ?? Response.error())
      )
    );
  }
  // All other requests pass through (API calls etc.)
});

// ── Push: show notification ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = { title: 'Lumina', body: 'Time to check in!', icon: '/icons/icon-192.png', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch { /* ignore malformed JSON */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    payload.icon,
      badge:   '/icons/icon-96.png',
      vibrate: [200, 100, 200],
      data:    { url: payload.url },
      actions: [
        { action: 'open',    title: '✦ Open Lumina' },
        { action: 'dismiss', title: 'Dismiss'       },
      ],
    })
  );
});

// ── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ── Periodic background sync (for daily reminders) ──────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'lumina-daily-check') {
    event.waitUntil(showDailyReminder());
  }
});

async function showDailyReminder() {
  const now  = new Date();
  const hour = now.getHours();
  // Only fire between 8-10 AM
  if (hour < 8 || hour > 10) return;
  await self.registration.showNotification('Good morning ✦', {
    body:  'How are you feeling today? Open Lumina to log your morning check-in.',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data:  { url: '/journal' },
  });
}
