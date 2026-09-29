self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { titolo: 'Jarvis', testo: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titolo || 'Jarvis', {
    body: d.testo || '',
    tag: d.tag || 'jarvis',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { id: d.id },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (tabs.length) { tabs[0].postMessage({ tipo: 'inbox' }); return tabs[0].focus(); }
    return self.clients.openWindow('/?da=notifica');
  })());
});
