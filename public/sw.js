// Service Worker para Notificações Push REVMED
const VAPID_PUBLIC_KEY = "BHob7rwXNuo0NXUaXR_F2y2IpsnHG8j8I7Tuhdi90ltYe4U9I6sMs7al1n1UPKKN40Wkx6kayrs3kgd7OJn8elI";

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const { title, body, url } = data;
    
    event.waitUntil(
      self.registration.showNotification(title || 'Nova Notificação', {
        body: body || 'Você tem uma nova atualização do REVMED.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: url || '/' }
      })
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
