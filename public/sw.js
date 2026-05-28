// Service Worker para Notificações Push REVMED
const VAPID_PUBLIC_KEY = "BBfWRvZW1Pd4zpLdKk4ky2YYQpHpQyzN_a8pY83wdctKlw98CxsD_n7fXmw2ix7CUlvigzqpEjyXch_BmOiVXh4";

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

// Forçar atualização do SW quando as chaves mudarem
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
