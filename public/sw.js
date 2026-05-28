const VAPID_PUBLIC_KEY = "BFE9sPojxQQCmwoI8wL5iaHph1s1V3B37SAIu-DrrzsyTn0JxVFhvxo5Qcbb7aIIlC9zsYzS5bjFJzjLHOA1250";

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const { title, body, url } = data;
    
    event.waitUntil(
      self.registration.showNotification(title || 'Nova Notificação', {
        body: body || 'Você tem uma nova atualização do REVMED.',
        icon: '/favicon.ico', // Ajuste para o seu ícone
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
