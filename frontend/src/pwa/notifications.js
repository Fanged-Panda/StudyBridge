/**
 * Push notification preparation.
 *
 * The service worker (src/pwa/sw.js) already handles `push` and
 * `notificationclick` events. This module scaffolds the client-side pieces
 * needed to subscribe users once a push backend exists (e.g. web-push on the
 * Express/Render backend). No backend notification server is implemented yet —
 * these helpers are ready to be wired to UI when it is.
 */

/** True when this browser supports push notifications. */
export const isPushSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** Requests the browser notification permission. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

/**
 * Subscribe the current device to push. Requires a VAPID public key from the
 * backend (not deployed yet — returns null for now).
 *
 * Usage once the backend is live:
 *   const subscription = await subscribeToPush('YOUR_VAPID_PUBLIC_KEY');
 *   await fetch(`${apiUrl}/notifications/subscribe`, { method: 'POST', body: JSON.stringify(subscription) });
 */
export async function subscribeToPush(vapidPublicKey) {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  return subscription;
}

/** Converts a base64url VAPID key to a Uint8Array (required by the Push API). */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
