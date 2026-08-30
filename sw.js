/* ============================================================
   iMathAcademy — Service worker
   ------------------------------------------------------------
   Its only job is notifications. A parent who enquires at 11pm
   should reach a teacher's phone, not wait to be noticed the next
   time somebody opens the app.

   Deliberately no caching. Cached pages have cost us a day of
   confusion more than once, and a stale worksheet is worse than a
   slow one.
   ============================================================ */

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  var title = data.title || 'iMath Academy';
  var opts = {
    body: data.body || 'Something needs your attention',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-32.png',
    tag: data.tag || 'imath',
    data: { url: data.url || '/portal/teacher/enquiries.html' },
    requireInteraction: false,
    vibrate: [120, 60, 120]
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  // Reuse a window that is already open rather than piling up tabs
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(url) > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) { event.waitUntil(clients.claim()); });
