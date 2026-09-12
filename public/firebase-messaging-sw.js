// public/firebase-messaging-sw.js

// ၁။ Firebase SDKs ကို import လုပ်ခြင်း
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ၂။ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDZp2yLittnCqMuynDJE-YZcgWdAxmymwo",
  authDomain: "d-saing-chat.firebaseapp.com",
  databaseURL: "https://d-saing-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "d-saing-chat",
  storageBucket: "d-saing-chat.firebasestorage.app",
  messagingSenderId: "533173820233",
  appId: "1:533173820233:web:93361cab4873f791991898",
  measurementId: "G-W63WPRF433"
};

// ၃။ Firebase ကို Initialize လုပ်ခြင်း
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

// ၄။ Messaging ကို ရယူခြင်း
const messaging = firebase.messaging();

// ===== PWA Cache =====
const CACHE_NAME = "d-saing-v4"; // ✅ version အသစ်

// ✅ Offline Response ပြန်တဲ့ Helper
const offlineResponse = () => new Response('Offline', {
  status: 503,
  statusText: 'Service Unavailable',
  headers: new Headers({ 'Content-Type': 'text/plain' }),
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Caching assets...");
      return cache.addAll([
        "/",
        "/messages",
        "/manifest.json",
        "/icons/icon-192x192.png",
        "/icons/icon-512x512.png"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ✅ Fetch Handler - Filter လုပ်ထားတယ်
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // ❌ GET မဟုတ်ရင် Cache မလုပ်ဘူး
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // ❌ Firebase, Google APIs, Cloudinary, Unsplash တွေကို Cache မလုပ်ဘူး
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('unsplash.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // ❌ HTTP/HTTPS မဟုတ်ရင် Cache မလုပ်ဘူး
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // ✅ Navigation requests တွေအတွက် Network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          // ✅ Cache မရှိရင် Default Response ပြန်
          return cached || offlineResponse();
        });
      })
    );
    return;
  }

  // ✅ Same-Origin requests တွေအတွက်ပဲ Cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // ✅ Response ကို Cache လုပ်ဖို့ သေချာစစ်ပါ
            if (
              response &&
              response.status === 200 &&
              response.type === 'basic'
            ) {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clonedResponse).catch((err) => {
                  // ✅ Cache.put() error တက်ရင် လျစ်လျူရှုပါ
                  console.warn('⚠️ Cache.put failed (ignored):', err.message);
                });
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request).then((cached) => {
              // ✅ Cache မရှိရင် Default Response ပြန်
              return cached || offlineResponse();
            });
          });
      })
    );
  }
});

// ===== Push Notifications (Firebase Background Message) =====
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.data?.title || payload.notification?.title || 'D Saing';
  const notificationBody = payload.data?.body || payload.notification?.body || 'New message!';
  
  const notificationUrl = payload.data?.url || (payload.data?.chatId ? `/messages/${payload.data.chatId}` : '/messages');
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      url: notificationUrl,
      chatId: payload.data?.chatId || '',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ===== Notification Click =====
self.addEventListener("notificationclick", (event) => {
  console.log('🔔 Notification clicked:', event.notification.data);
  
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || "/messages";
  const fullUrl = new URL(targetUrl, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === fullUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});