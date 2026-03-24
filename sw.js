// sw.js - Service Worker для кэширования и push
const CACHE_NAME = 'linkup-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/profile.html',
  '/messages.html',
  '/requests.html',
  '/auth.js',
  '/script.js',
  '/messages.js',
  '/notifications.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
];

// Установка
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Обработка запросов
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Обновление кэша
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// ========== PUSH УВЕДОМЛЕНИЯ ==========
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'LinkUp', options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data.url;
  event.waitUntil(
    clients.openWindow(url)
  );
});
// sw.js - добавить в конец файла

// PUSH УВЕДОМЛЕНИЯ
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'LinkUp', body: event.data.text() };
        }
    }
    
    const options = {
        body: data.body || 'Новое уведомление',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'LinkUp', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const url = event.notification.data.url;
    event.waitUntil(
        clients.openWindow(url)
    );
});