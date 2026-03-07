/**
 * usePermissions — registers the service worker and manages all runtime
 * permissions: Push Notifications, Badges, and Periodic Sync.
 *
 * Call once high up in the tree (App.tsx) after the user is logged in.
 */
import { useEffect, useRef } from 'react';

// ── SW registration ──────────────────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.info('[SW] registered', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[SW] registration failed:', err);
    return null;
  }
}

// ── Notification permission ──────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── App Badge API (home-screen number badge) ─────────────────────────────────
export function setAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> })
      .setAppBadge(count).catch(() => {});
  }
}

export function clearAppBadge() {
  if ('clearAppBadge' in navigator) {
    (navigator as Navigator & { clearAppBadge: () => Promise<void> })
      .clearAppBadge().catch(() => {});
  }
}

// ── Periodic Background Sync ─────────────────────────────────────────────────
export async function registerPeriodicSync(reg: ServiceWorkerRegistration) {
  // @ts-ignore — PeriodicSyncManager is not in standard TS lib yet
  if (!('periodicSync' in reg)) return;
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (status.state === 'granted') {
      // @ts-ignore
      await reg.periodicSync.register('lumina-daily-check', { minInterval: 24 * 60 * 60 * 1000 });
      console.info('[SW] periodic sync registered');
    }
  } catch (err) {
    console.warn('[SW] periodic sync not available:', err);
  }
}

// ── Show a local notification immediately ────────────────────────────────────
export async function showLocalNotification(title: string, body: string, url = '/') {
  if (getNotificationPermission() !== 'granted') return;
  const reg = await navigator.serviceWorker?.ready.catch(() => null);
  if (reg) {
    await reg.showNotification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      data:  { url },
    });
  } else {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  }
}

// ── React hook — call once in App.tsx after login ────────────────────────────
export function usePermissions(isLoggedIn: boolean) {
  const initialised = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || initialised.current) return;
    initialised.current = true;

    (async () => {
      // 1. Register SW
      const reg = await registerServiceWorker();

      // 2. Request notification permission (only if not already decided)
      const savedPref = localStorage.getItem('notif');
      if (savedPref === null && Notification.permission === 'default') {
        // Small delay so the UI has fully loaded
        setTimeout(async () => {
          const perm = await requestNotificationPermission();
          localStorage.setItem('notif', String(perm === 'granted'));
          if (perm === 'granted') {
            await showLocalNotification(
              'Lumina is ready ✦',
              'Notifications enabled — you\'ll receive daily reminders and updates.'
            );
          }
        }, 3000);
      }

      // 3. Register periodic background sync (daily reminder)
      if (reg && localStorage.getItem('daily_reminder') !== 'false') {
        await registerPeriodicSync(reg);
      }
    })();
  }, [isLoggedIn]);
}
