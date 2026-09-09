// public/firebase-messaging-sw.js

// ၁။ Firebase SDKs ကို import လုပ်ခြင်း
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ၂။ Firebase Config (သင့်ရဲ့ config အချက်အလက်များကို ဒီမှာ အပြည့်အစုံ ထည့်ပါ)
const firebaseConfig = {
  apiKey: "AIzaSyDZp2yLittnCqMuynDJE-YZcgWdAxmymwo",
  authDomain: "d-saing-chat.firebaseapp.com",
  projectId: "d-saing-chat",
  storageBucket: "d-saing-chat.firebasestorage.app",
  messagingSenderId: "533173820233",
  appId: "1:533173820233:web:93361cab4873f791991898",
};

// ၃။ Firebase ကို Initialize လုပ်ခြင်း (Service Worker အတွက် အဓိက)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

// ၄။ Messaging ကို ရယူခြင်း
const messaging = firebase.messaging();

// ===== PWA Cache =====
const CACHE_NAME = "d-saing-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Caching assets...");
      return cache.addAll([
        "/",
        "/messages",
        "/messages/[chatId]",  // ✅ Dynamic route အတွက် ထည့်ပါ
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

self.addEventListener("fetch", (event) => {
  // ✅ messages/[chatId] အတွက် Navigation Preload သုံးပါ
  if (event.request.mode === 'navigate' && event.request.url.includes('/messages/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/messages');
      })
    );
    return;
  }

  if (event.request.method === 'POST') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ===== Push Notifications (Firebase Background Message) =====
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.data?.title || payload.notification?.title || 'D Saing';
  const notificationBody = payload.data?.body || payload.notification?.body || 'New message!';
  
  const chatId = payload.data?.chatId || '';
  const notificationUrl = chatId ? `/messages/${chatId}` : '/messages';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      url: notificationUrl,
      chatId: chatId,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ===== Notification Click =====
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || "/messages";
  const chatId = event.notification.data?.chatId || '';
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // ရှိပြီးသား Client ကိုရှာပါ
      for (const client of clientList) {
        if (client.url.includes("/messages") && "focus" in client) {
          // chatId ရှိရင် သီးခြား Chat Room ကိုသွားပါ
          if (chatId && client.url.includes(chatId)) {
            return client.focus();
          }
          return client.focus();
        }
      }
      // မရှိရင် အသစ်ဖွင့်ပါ
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});